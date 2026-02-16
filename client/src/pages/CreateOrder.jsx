import { useState, useEffect, useRef } from 'react'
import { SERVER_URL, capitalise } from '../utils';

const MAX_DISPLAY_WIDTH = 300;

function BurgerCreationMenu() {

    const [allburgerParts, setBurgerParts] = useState({});

    const [currentBurger, setCurrentBurger] = useState([]);

    const [hoverLayer, setHoverLayer] = useState(null);
    
    const hoverLayerData = useRef(null);

    const nextLayerId = useRef(0);

    const activeSectionIdx = useRef(0);

    const heightLims = useRef(null);

    // Creates an array with the ids necessary for updating the burger using events
    function convertBurgerSections(burgerSections) {
        const convBurgerSections = [];

        for (const section of burgerSections) {
            const sectionLayers = [];
            for (const layerId of section.layerIds) {
                sectionLayers.push({nameId: layerId, uId: nextLayerId.current});
                nextLayerId.current++;
            }
            convBurgerSections.push({isStatic: section.isStatic, layerIdObjs: sectionLayers})
        }
        return convBurgerSections;
    }

    useEffect(() => {
        fetch(`${SERVER_URL}/api/parts/burger`)
            .then(res => res.json())
            .then(data => {
                setBurgerParts(data)
                setCurrentBurger(convertBurgerSections(data.structure.sections))
                activeSectionIdx.current = data.structure.defaultActiveSectionIdx
            })
    }, []);

    useEffect(() => {
        const layeredItemElem = document.querySelector(".layered-item-container");
        let dragLayerFunc = (event) => dragLayer(event);

        //stop events from triggering without selected layer
        function onMouseUp() {
            console.log("removing")
            layeredItemElem.removeEventListener("mousemove", dragLayerFunc);
            document.removeEventListener("mouseup", onMouseUp);
            setHoverLayer(null);
            heightLims.current = null;
        }

        let selectLayerFunc = (event) => {
            if (selectLayer(event)) {
                layeredItemElem.addEventListener("mousemove", dragLayerFunc);
                document.addEventListener("mouseup", onMouseUp);
            }
        };
        

        layeredItemElem.addEventListener("mousedown", selectLayerFunc);
        return function() {
            layeredItemElem.removeEventListener("mousedown", selectLayerFunc)
        }
    }, [currentBurger, window.innerWidth, window.innerHeight])

    // Update the current burger
    function addIngredient(partName) {
        setCurrentBurger(prevBurger => {
            const section = prevBurger[activeSectionIdx.current];
            const newSection = {isStatic: section.isStatic, layerIdObjs: [...section.layerIdObjs, {nameId: partName, uId: nextLayerId.current}]};
            return [...prevBurger.slice(0, activeSectionIdx.current), newSection, ...prevBurger.slice(activeSectionIdx.current+1)];
        })
        nextLayerId.current++;
    }

    /**
     * Attempts to calculate height of a static array section.
     * @param {*} section static section of a burger (layered item) to be processed.
     * @param {*} heightsArr current array of heights
     * @param {*} layerOffsetY y-axis offset of the top-most layer in the most recently processed layered-item section.
     */
    function buildStaticSectionHeight(section, heightsArr, layerOffsetY) {
        const layerIdObjs = section.layerIdObjs;

        for (const layerIdObj of layerIdObjs) {
            const part = allburgerParts.allParts[layerIdObj.nameId];
            layerOffsetY += part.thickness * size_ratio;
        }

        // Register entire section as single layer so you can't place layers inbetween
        heightsArr.push({prev: null, next: null, offsetY: layerOffsetY})

        return layerOffsetY;
    }

    function buildDynamicSectionHeight(section, heightsArr, layerOffsetY) {
        const layerIdObjs = section.layerIdObjs;
        let prev = null;

        for (let layerIdx = 0; layerIdx < layerIdObjs.length; layerIdx++) {
            const part = allburgerParts.allParts[layerIdObjs[layerIdx].nameId];
            //add node to linked list of heights to allow changing the order of components more easily.
            const layerThickness = part.thickness * size_ratio;
            const newCell = {prev: prev, next: null, lowY: layerOffsetY, thickness: layerThickness};

            layerOffsetY += layerThickness;

            if (prev !== null)
                prev["next"] = newCell;
            heightsArr.push(newCell);
            prev = newCell;
        }

        return layerOffsetY;
    }

    // Event where one of the layers in a layered menu item can be dragged around
    function selectLayer(event) {
        event.preventDefault();

        // Check if what was clicked is actually a later img, otherwise not worth doing the rest
        if (!event.target.classList.contains("ingredient-layer")) {
            return
        }

        const baseOffset = event.currentTarget.getBoundingClientRect().bottom;
        const mouseOffsetY = baseOffset - event.clientY;
        let layerOffsetY = 0;
        let heightNode = null;
        
        // Find the layer corresponding to the mouse position
        const heightsArr = [];
        for (let sectionIdx = 0; sectionIdx < currentBurger.length; sectionIdx++) {
            const section = currentBurger[sectionIdx]
            const isStatic = section.isStatic;

            if (isStatic) {
                layerOffsetY = buildStaticSectionHeight(section, heightsArr, layerOffsetY, mouseOffsetY);
                //not worth building height array if registered click was on
                if (heightNode === null && layerOffsetY > mouseOffsetY)
                    return false;
            } else {
                const sectionStartIdx = heightsArr.length;
                layerOffsetY = buildDynamicSectionHeight(section, heightsArr, layerOffsetY);
                //checking if the mouse is within the layer bounds
                for (let layerIdx = 0; layerIdx < section.layerIdObjs.length; layerIdx++) {
                    const node = heightsArr[sectionStartIdx+layerIdx];
                    const compOffsetY = node.lowY + node.thickness;
                    if (heightNode === null && compOffsetY > mouseOffsetY) {
                        heightNode = node;
                        hoverLayerData.current = {sectionIdx: sectionIdx, layerIdx: layerIdx};
                        setHoverLayer(section.layerIdObjs[layerIdx].uId);
                    }
                }
            }
        }
        heightLims.current = {baseOffset: baseOffset, heightNode: heightNode, heightsArr: heightsArr};
        return true;
    }

    function dragLayer(event) {
        //node for comparing mouse position
        const compNode = heightLims.current.heightNode;
        const highY = compNode.lowY + compNode.thickness;
        
        //baseOffsetY - clientY because yOffset is measured from the top
        const localOffsetY = heightLims.current.baseOffset-event.clientY;
        if (localOffsetY > highY) {
            const next = compNode.next;
            if (next !== null && localOffsetY > next.lowY + (next.thickness/2)) // next centerY = next.lowY + (next.thickness/2)
                pushHoverLayerUp();
        } else if (localOffsetY < compNode.lowY) {
            const prev = compNode.prev;
            if (prev !== null && localOffsetY < prev.lowY + (prev.thickness/2))
                pushHoverLayerDown();
        }
    }

    function pushHoverLayerUp() {
        //check that the layer isn't the last of its section.
        if (hoverLayerData.current.layerIdx < currentBurger[hoverLayerData.current.sectionIdx].layerIdObjs.length - 1) {
            setCurrentBurger(prevBurger => {
                const newSection = prevBurger[hoverLayerData.current.sectionIdx]
                const layerIds = prevBurger[hoverLayerData.current.sectionIdx].layerIdObjs;
                //create new section such that [..., target, next, ...] becomes [..., next, target, ...]
                const layerIdx = hoverLayerData.current.layerIdx;
                const sectionIdx = hoverLayerData.current.sectionIdx;
                newSection.layerIdObjs = [...layerIds.slice(0, layerIdx), layerIds[layerIdx+1], layerIds[layerIdx], ...layerIds.slice(layerIdx+2)];
                // Update hover layer idx
                hoverLayerData.current.layerIdx++;
                return [...prevBurger.slice(0, sectionIdx), newSection, ...prevBurger.slice(sectionIdx+1)];
            })

            if (heightLims.current !== null) {
                const compNode = heightLims.current.heightNode;
                const prev = compNode.prev;
                const next = compNode.next;

                // Adjust perceived positions for layers
                next.lowY -= compNode.thickness;
                compNode.lowY += next.thickness;

                /* No checking that next is null because it's a precondition for this function
                 * (the layerIdx not matching the last of its section should indicate this other data structure is correct, but doesn't guarantee it ).*/
                const nextnext = next.next;
                // Adjust compNode links
                compNode.prev = next;
                compNode.next = nextnext;
                // Adjust backlink of node that follows "next"
                if (nextnext != null)
                    nextnext.prev = compNode
                // Adjust previous and next node links
                next.prev = prev;
                if (prev !== null)
                    prev.next = next;
            } else {
                console.error("Error on pushing hover layer up: heightLims current is 'null' -> should never happen in this function")
            }
        } else {
            console.error("Layer is already at the top.")
        }
    }

    function pushHoverLayerDown() {
        //check tat the layer isn't the first of its section.
        if (hoverLayerData.current.layerIdx !== 0) {
            setCurrentBurger(prevBurger => {
                const newSection = prevBurger[hoverLayerData.current.sectionIdx]
                const layerIds = prevBurger[hoverLayerData.current.sectionIdx].layerIdObjs;
                //create new section such that [..., prev, target, ...] becomes [..., target, prev, ...]
                const layerIdx = hoverLayerData.current.layerIdx;
                const sectionIdx = hoverLayerData.current.sectionIdx;
                newSection.layerIdObjs = [...layerIds.slice(0, Math.max(0, layerIdx-1)), layerIds[layerIdx], layerIds[layerIdx-1], ...layerIds.slice(layerIdx+1)];
                // Update hover layer idx
                hoverLayerData.current.layerIdx--;
                return [...prevBurger.slice(0, sectionIdx), newSection, ...prevBurger.slice(sectionIdx+1)];
            })

            if (heightLims.current !== null) {
                const compNode = heightLims.current.heightNode;
                const prev = compNode.prev;
                const next = compNode.next;

                //Adjust perceived positions for layers
                compNode.lowY -= prev.thickness;
                prev.lowY += compNode.thickness;

                /* No checking that prev is null because it's a precondition for this function
                 * (the layerIdx not matching the last of its section should indicate this other data structure is correct, but doesn't guarantee it ).*/
                const prevprev = prev.prev;
                // Adjust compNode links
                compNode.next = prev;
                compNode.prev = prevprev;
                // Adjust backlink of node that precedes "prev"
                if (prevprev != null)
                    prevprev.next = compNode;
                // Adjust previous and next node links
                prev.next = next;
                if (next !== null)
                    next.prev = prev;
            } else {
                console.error("Error on pushing hover layer down: heightLims current is 'null' -> should never happen in this function")
            }
        } else {
            console.error("Layer is already at the bottom.")
        }
    }

    const partGroupElems = allburgerParts.groupOrder !== undefined ? allburgerParts.groupOrder.map(groupName => {
        const group = allburgerParts.groups[groupName];       
        return (
            <div key={group.name} className="part-group-container">
            <h2>{capitalise(group.name)}</h2>
            <div className="ingredient-btn-holder">
            {group.parts.map(part =>
            <button
                onClick={() => addIngredient(part)}
                key={part}
                className="ingredient-btn"
            >{(allburgerParts.allParts[part]).name}</button>
            )}
            </div>
            </div>
        )
        }
    ) : null;

    const burgerLayerElems = []
    const size_ratio = MAX_DISPLAY_WIDTH / allburgerParts.maxWidth;
    //Unscaled cumulative offset for the displayed layers
    let bottomOffsetY = 0;
    let layerNum = 1;
    for (const [sectionIdx, section] of currentBurger.entries()) {
        for (const layerIdObj of section.layerIdObjs) {
            const part = allburgerParts.allParts[layerIdObj.nameId];
            const width = part.width * size_ratio;
            const height = part.height * size_ratio;
            //Overlap bottom part of image when thickness is less than height.
            //I avoid pre-calculating the values for part.thickness * height_ratio to lose less accuracy,
            const overlapOffsetY = (part.height - (part.thickness + part.offsetTop));
            const scaledOffset = (bottomOffsetY - overlapOffsetY) * size_ratio;

            const style = {width: `${width}px`, height: `${height}px`, bottom: `${scaledOffset}px`};
            if (hoverLayer !== null && ( hoverLayer === layerIdObj.uId) )
                style["opacity"] = 0.5;
            bottomOffsetY += part.thickness;
            burgerLayerElems.push(
            <img
                style={style}
                key={layerIdObj.uId}
                data-u-id={layerIdObj.uId}
                data-section-idx={sectionIdx}
                className="ingredient-layer"
                src={part.imgUrl}
                alt={`Burger layer ${layerNum}: ${part.name}`}
            />)
            layerNum++;
        }
    }

    const itemDisplayStyle = {minWidth: MAX_DISPLAY_WIDTH}

    return (
        <>
        <h1>Your borgar:</h1>
        <div className="creation-window">
            <div style={itemDisplayStyle} className="layered-item-container">
                {burgerLayerElems}
            </div>
            <div className="creation-menu">
                {partGroupElems}
            </div>
        </div>
        </>
    )
}

export default function CreateOrder() {

    const [isCreatingBurger, setIsCreatingBurger] = useState(false);

    function revealBurgerCreationMenu(){
        setIsCreatingBurger(true);
    }

    return (
        <main>
            <h1 className="title">This is the order creation page</h1>
            {(!isCreatingBurger) ? <button onClick={revealBurgerCreationMenu}>Create Burger</button> :
                <BurgerCreationMenu />
            }
        </main>
    )
}
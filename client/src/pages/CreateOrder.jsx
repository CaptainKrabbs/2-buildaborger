import { useState, useEffect, useRef } from 'react'
import { SERVER_URL, capitalise, setAtIdx, insertAtIdx, insertFirst, insertLast, removeFirst, removeLast, swap } from '../utils';

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
            convBurgerSections.push({layerIdObjs: sectionLayers})
        }
        return convBurgerSections;
    }

    // Retrieve burger parts and structure
    useEffect(() => {
        fetch(`${SERVER_URL}/api/parts/burger`)
            .then(res => res.json())
            .then(data => {
                setBurgerParts(data)
                setCurrentBurger(convertBurgerSections(data.structure.sections))
                activeSectionIdx.current = data.structure.defaultActiveSectionIdx
            })
    }, []);

    // Set up events for dragging around layers
    useEffect(() => {
        const layeredItemElem = document.querySelector(".layered-item-container");
        let dragLayerFunc = (event) => dragLayer(event);

        //stop events from triggering without selected layer
        function onMouseUp() {
            document.removeEventListener("mousemove", dragLayerFunc);
            document.removeEventListener("mouseup", onMouseUp);
            setHoverLayer(null);
            activeSectionIdx.current = hoverLayerData.current.sectionIdx;
            hoverLayerData.current = null;
            heightLims.current = null;
        }

        let selectLayerFunc = (event) => {
            if (selectLayer(event)) {
                document.addEventListener("mousemove", dragLayerFunc);
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
            const newSection = {layerIdObjs: [...section.layerIdObjs, {nameId: partName, uId: nextLayerId.current}]};
            return insertAtIdx(prevBurger, activeSectionIdx.current, newSection);
        })
        nextLayerId.current++;
    }

    /**
     * Attempts to calculate height of a static array section.
     * @param {*} sectionIdx index of static section of a burger (layered item) to be processed.
     * @param {*} tailNode most recent node with height information
     * @param {*} layerOffsetY y-axis offset of the top-most layer in the most recently processed layered-item section.
     */
    function buildStaticSectionHeight(sectionIdx, tailNode, layerOffsetY) {
        //increment by display height of static section
        const displayThickness = allburgerParts.structure.sections[sectionIdx].height * size_ratio;
        const newNode = {prev: tailNode, next: null, lowY: layerOffsetY, thickness: displayThickness, isStatic: true};
        if (tailNode !== null)
            tailNode.next = newNode;

        layerOffsetY += displayThickness;
        return {layerOffsetY: layerOffsetY, tail: newNode};
    }

    function buildDynamicSectionHeight(section, tailNode, layerOffsetY) {
        const layerIdObjs = section.layerIdObjs;

        for (let layerIdx = 0; layerIdx < layerIdObjs.length; layerIdx++) {
            const part = allburgerParts.allParts[layerIdObjs[layerIdx].nameId];
            //add node to linked list of heights to allow changing the order of components more easily.
            const displayThickness = part.thickness * size_ratio;
            const newNode = {prev: tailNode, next: null, lowY: layerOffsetY, thickness: displayThickness, isStatic: false};

            layerOffsetY += displayThickness;

            if (tailNode !== null)
                tailNode.next = newNode;
            tailNode = newNode;
        }
        return {layerOffsetY: layerOffsetY, tail: tailNode};
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
        let tailNode = null;
        let heightNode = null;

        for (let sectionIdx = 0; sectionIdx < currentBurger.length; sectionIdx++) {
            const section = currentBurger[sectionIdx]
            const isStatic = allburgerParts.structure.sections[sectionIdx].isStatic;

            if (isStatic) {
                ({layerOffsetY: layerOffsetY, tail: tailNode} = buildStaticSectionHeight(sectionIdx, tailNode, layerOffsetY));
                //not worth building height array if registered click was on
                if (heightNode === null && layerOffsetY > mouseOffsetY) {
                    return false;
                }
            } else {
                const prevLayeroffsetY = layerOffsetY;
                ({layerOffsetY: layerOffsetY, tail: tailNode} = buildDynamicSectionHeight(section, tailNode, layerOffsetY));
                // No point going through the loop if the editable section is empty or if heightnode is already established.
                if (prevLayeroffsetY != layerOffsetY && heightNode === null) {
                    let layerIdx = section.layerIdObjs.length - 1;
                    //checking if the mouse is within the layer bounds
                    for (let node = tailNode; node !== null && (node.lowY + node.thickness > mouseOffsetY); node = node.prev) {
                        heightNode = node;
                        layerIdx--;
                    }
                    layerIdx++; //last valid node also has layerIdx-- at the end.
                    if (heightNode !== null) {
                        hoverLayerData.current = {sectionIdx: sectionIdx, layerIdx: layerIdx};
                        setHoverLayer(section.layerIdObjs[layerIdx].uId);
                    }
                }
            }
        }
        heightLims.current = {baseOffset: baseOffset, heightNode: heightNode};
        return true;
    }

    function dragLayer(event) {
        //baseOffsetY - clientY because yOffset is measured from the top
        const mouseOffsetY = heightLims.current.baseOffset-event.clientY;

        //node for comparing mouse position
        const compNode = heightLims.current.heightNode;
        const highY = compNode.lowY + compNode.thickness;

        if (mouseOffsetY > highY) {
            handleDrag(compNode.next, mouseOffsetY, pushHoverLayerUp, pushHoverLayerNextSection, true);
        } else if (mouseOffsetY < compNode.lowY) {
            handleDrag(compNode.prev, mouseOffsetY, pushHoverLayerDown, pushHoverLayerPrevSection, false);
        }
    }

    function handleDrag(layerInfo, mouseOffsetY, staticLayerHandler, dynamicLayerHandler, isMoveUp) {
        if (layerInfo !== null) {
            if (!layerInfo.isStatic && ( isMoveUp ? mouseOffsetY > layerInfo.lowY + (layerInfo.thickness/2) : mouseOffsetY < layerInfo.lowY + (layerInfo.thickness/2))) // centerY = layerInfo.lowY + (layerInfo.thickness/2)
                staticLayerHandler();
            else if (layerInfo.isStatic && (isMoveUp ? mouseOffsetY > layerInfo.lowY + layerInfo.thickness : mouseOffsetY < layerInfo.lowY ))
                dynamicLayerHandler();
        }
    }

    function pushHoverLayerUp() {
        setCurrentBurger(prevBurger => {
            const newSection = prevBurger[hoverLayerData.current.sectionIdx]
            const layerIds = prevBurger[hoverLayerData.current.sectionIdx].layerIdObjs;
            //create new section such that [..., target, next, ...] becomes [..., next, target, ...]
            const sectionIdx = hoverLayerData.current.sectionIdx;
            newSection.layerIdObjs = swap(layerIds, hoverLayerData.current.layerIdx);
            // Update hover layer idx
            hoverLayerData.current.layerIdx++;
            return setAtIdx(prevBurger, sectionIdx, newSection);
        })
        if (heightLims.current !== null) {
            swapLayerLinkForward(heightLims.current.heightNode)
        } else {
            console.error("Error on pushing hover layer up: heightLims current is 'null' -> should never happen in this function")
        }
    }

    // Pre-condition: hoverLayerData sectionIdx is within existing sections and is not static (is modifiable)
    //  -> hoverLayerData.current.sectionIdx > 0 && hoverLayerData.current.sectionIdx < allburgerParts.structure.sections.length - 1
    // && !allburgerParts.structure.sections[hoverLayerData.current.sectionIdx].isStatic
    function pushHoverLayerNextSection() {
        // A layer can only be pushed into the next section if it is linked by the current (next non-static section)
        const currentSectionIdx = hoverLayerData.current.sectionIdx;
        const nextSectionIdx = allburgerParts.structure.sections[currentSectionIdx].nextIdx;

        // Layer is already in the last editable section, nowhere to go
        if (nextSectionIdx === null)
            return;
        if (allburgerParts.structure.sections[nextSectionIdx].isStatic) {
            console.error("Error in burger section structure. Editable section pointing to static section")
            return;
        }

        setCurrentBurger(prevBurger => {
            const newBurger = [...prevBurger];
            const layerIdObj = newBurger[hoverLayerData.current.sectionIdx].layerIdObjs[hoverLayerData.current.layerIdx];
            newBurger[currentSectionIdx] = {layerIdObjs: removeLast(prevBurger[currentSectionIdx].layerIdObjs)};
            newBurger[nextSectionIdx] = {layerIdObjs: insertFirst(newBurger[nextSectionIdx].layerIdObjs, layerIdObj)};

            // Set hover layer data to first layer of the next section
            hoverLayerData.current.sectionIdx = nextSectionIdx;
            hoverLayerData.current.layerIdx = 0;
            activeSectionIdx.current = nextSectionIdx;
            return newBurger;
        });

        for (let i = currentSectionIdx + 1; i < nextSectionIdx; i++)
            swapLayerLinkForward(heightLims.current.heightNode);
    }

    function swapLayerLinkForward(compNode) {
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
        next.next = compNode;
        if (prev !== null)
            prev.next = next;
    }

    function pushHoverLayerDown() {
        setCurrentBurger(prevBurger => {
            const newSection = prevBurger[hoverLayerData.current.sectionIdx]
            const layerIds = prevBurger[hoverLayerData.current.sectionIdx].layerIdObjs;
            //create new section such that [..., prev, target, ...] becomes [..., target, prev, ...]
            const sectionIdx = hoverLayerData.current.sectionIdx;
            newSection.layerIdObjs = swap(layerIds, hoverLayerData.current.layerIdx-1);
            // Update hover layer idx
            hoverLayerData.current.layerIdx--;

            return setAtIdx(prevBurger, sectionIdx, newSection);
        })
        if (heightLims.current !== null) {
            swapLayerLinkBackward(heightLims.current.heightNode);
        } else {
            console.error("Error on pushing hover layer down: heightLims current is 'null' -> should never happen in this function")
        }
    }

    // Pre-condition: hoverLayerData sectionIdx is within existing sections and is not static (is modifiable)
    //  -> hoverLayerData.current.sectionIdx > 0 && hoverLayerData.current.sectionIdx < allburgerParts.structure.sections.length - 1
    // && !allburgerParts.structure.sections[hoverLayerData.current.sectionIdx].isStatic
    function pushHoverLayerPrevSection() {
        // A layer can only be pushed into the next section if it is linked by the current (next non-static section)
        const currentSectionIdx = hoverLayerData.current.sectionIdx;
        const prevSectionIdx = allburgerParts.structure.sections[currentSectionIdx].prevIdx;

        // Layer is already in the last editable section, nowhere to go
        if (prevSectionIdx === null)
            return;
        if (allburgerParts.structure.sections[prevSectionIdx].isStatic) {
            console.error("Error in burger section structure. Editable section pointing to static section")
            return;
        }

        setCurrentBurger(prevBurger => {
            const newBurger = [...prevBurger];
            const layerIdObj = newBurger[hoverLayerData.current.sectionIdx].layerIdObjs[hoverLayerData.current.layerIdx];
            newBurger[currentSectionIdx] = {layerIdObjs: removeFirst(prevBurger[currentSectionIdx].layerIdObjs)};
            newBurger[prevSectionIdx] = {layerIdObjs: insertLast(newBurger[prevSectionIdx].layerIdObjs, layerIdObj)};

            // Set hover layer data to first layer of the prev section
            hoverLayerData.current.sectionIdx = prevSectionIdx;
            hoverLayerData.current.layerIdx = newBurger[prevSectionIdx].layerIdObjs.length - 1;
            return newBurger;
        });

        for (let i = currentSectionIdx - 1; i > prevSectionIdx; i--)
            swapLayerLinkBackward(heightLims.current.heightNode);
    }

    function swapLayerLinkBackward(compNode) {
        const prev = compNode.prev;
        if (prev === null) {
            console.error("Error on swapping layer with previous: No such layer.")
            return
        }
        const next = compNode.next;

        //Adjust perceived positions for layers
        compNode.lowY -= prev.thickness;
        prev.lowY += compNode.thickness;

        const prevprev = prev.prev;
        // Adjust compNode links
        compNode.next = prev;
        compNode.prev = prevprev;
        // Adjust backlink of node that precedes "prev"
        if (prevprev != null)
            prevprev.next = compNode;
        // Adjust previous and next node links
        prev.next = next;
        prev.prev = compNode;
        if (next !== null)
            next.prev = prev;
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
    for (const section of currentBurger) {
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
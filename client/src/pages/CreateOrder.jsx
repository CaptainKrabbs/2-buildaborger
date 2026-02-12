import { useState, useEffect } from 'react'
import { SERVER_URL, capitalise } from '../utils';

const MAX_DISPLAY_WIDTH = 300;

function BurgerCreationMenu() {

    const [allburgerParts, setBurgerParts] = useState({});

    const [currentBurger, setCurrentBurger] = useState([]);

    const [hoverPart, setHoverPart] = useState(null);

    const [nextLayerId, setNextLayerId] = useState(() => 0);

    const [activeSectionIdx, setActiveSectionIdx] = useState(() => 0);

    // Creates an array with the ids necessary for updating the burger using events
    function convertBurgerSections(burgerSections) {
        const convBurgerSections = [];
        let currentId = nextLayerId;

        for (const section of burgerSections) {
            const sectionLayers = [];
            for (const layerId of section.layerIds) {
                sectionLayers.push({nameId: layerId, uId: currentId});
                currentId++;
            }
            convBurgerSections.push({isStatic: section.isStatic, layerIdObjs: sectionLayers})
        }
        setNextLayerId(currentId);

        return convBurgerSections;
    }

    useEffect(() => {
        fetch(`${SERVER_URL}/api/parts/burger`)
            .then(res => res.json())
            .then(data => {
                setBurgerParts(data)
                setCurrentBurger(convertBurgerSections(data.structure.sections))
                setActiveSectionIdx(data.structure.defaultActiveSectionIdx)
            })
    }, []);

    useEffect(() => {
        const layeredItemElem = document.querySelector(".layered-item-container");
        let dragLayerFunc = (event) => dragLayer(event);

        //stop events from triggering without selected layer
        function onMouseUp() {
            console.log("removing")
            layeredItemElem.removeEventListener("mousemove", dragLayerFunc);
            layeredItemElem.removeEventListener("mouseup", onMouseUp);
            setHoverPart(null);
        }

        let selectLayerFunc = (event) => {
            layeredItemElem.addEventListener("mousemove", dragLayerFunc);
            layeredItemElem.addEventListener("mouseup", onMouseUp);
            selectLayer(event);
        };
        

        layeredItemElem.addEventListener("mousedown", selectLayerFunc);
        return function() {
            layeredItemElem.removeEventListener("mousedown", selectLayerFunc)
            layeredItemElem.removeEventListener("mousemove", dragLayerFunc)
        }
    }, [currentBurger, window.innerWidth, window.innerHeight])

    //Update the current burger
    function addIngredient(partName) {
        setCurrentBurger(prevBurger => {
            const section = prevBurger[activeSectionIdx];
            const newSection = {isStatic: section.isStatic, layerIdObjs: [...section.layerIdObjs, {nameId: partName, uId: nextLayerId}]};
            return [...prevBurger.slice(0, activeSectionIdx), newSection, ...prevBurger.slice(activeSectionIdx+1)];
        })
        setNextLayerId(prevId => prevId + 1);
    }

    /*Event where one of the layers in a layered menu item can be dragged around*/
    function selectLayer(event) {
        event.preventDefault();

        // check if what was clicked is actually a later img, otherwise not worth doing the rest
        if (!event.target.classList.contains("ingredient-layer")) {
            return
        }

        const mouseOffsetY = event.currentTarget.getBoundingClientRect().bottom - event.clientY;
        let layerOffsetY = 0;
        
        //find the layer corresponding to the mouse position
        for (const section of currentBurger) {
            for (const layerIdObj of section.layerIdObjs) {
                const part = allburgerParts.allLayers[layerIdObj.nameId];

                layerOffsetY += part.thickness * size_ratio;
                if (layerOffsetY > mouseOffsetY) {
                    console.log(part.name)
                    setHoverPart(layerIdObj.uId)
                    return
                }
            }
        }
    }

    function dragLayer(event) {
        if (hoverPart == null) {

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
            >{(allburgerParts.allLayers[part]).name}</button>
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
            const part = allburgerParts.allLayers[layerIdObj.nameId];
            const width = part.width * size_ratio;
            const height = part.height * size_ratio;
            //Overlap bottom part of image when thickness is less than height.
            //I avoid pre-calculating the values for part.thickness * height_ratio to lose less accuracy,
            const overlapOffsetY = (part.height - (part.thickness + part.offsetTop));
            const scaledOffset = (bottomOffsetY - overlapOffsetY) * size_ratio;

            const style = {width: `${width}px`, height: `${height}px`, bottom: `${scaledOffset}px`};
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
            <h1>This is the order creation page</h1>
            {(!isCreatingBurger) ? <button onClick={revealBurgerCreationMenu}>Create Burger</button> :
                <BurgerCreationMenu />
            }
        </main>
    )
}
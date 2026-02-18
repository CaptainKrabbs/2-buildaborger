import express from "express";
import cors from "cors"
import { CLIENT_URL } from "./utils.js";

const app = express();

const corsOptions = {
    origin: [CLIENT_URL],
};

app.use(cors(corsOptions))

function makePartsEntry(folder) {
    return (part) => {
        return {
            name: part.name,
            id: part.id,
            imgUrl: `/images${folder}/${part.id}.png`,
            width: part.width,
            height: part.height,
            thickness: part.thickness,
            offsetTop: part.offsetTop
        }
    }
}

app.get("/api/parts/burger", async (req, res) => {
    const allParts = {
        //bread
        bottomBun: {name: "Bottom Bun", id: "bottomBun", width: 440, height: 60, thickness: 60, offsetTop: 0},
        bun: {name: "Bun", id: "bun", width: 440, height: 60, thickness: 60, offsetTop: 0},
        topBun: {name: "Top Bun", id: "topBun", width: 440, height: 95, thickness: 95, offsetTop: 0},
        //patty
        patty: {name: "Patty", id: "patty", width: 450, height: 85, thickness: 85, offsetTop: 0},
        //veg
        lettuce: {name: "Lettuce", id: "lettuce", width: 470, height: 10, thickness: 10, offsetTop: 0},
        tomato: {name: "Tomato", id: "tomato", width: 467, height: 20, thickness: 20, offsetTop: 0},
        onionSlices: {name: "Onion Slices", id: "onionSlices", width: 420, height: 10, thickness: 10, offsetTop: 0},
        pickles: {name: "Pickles", id: "pickles", width: 456, height: 12, thickness: 6, offsetTop: 0},
        //extra
        egg: {name: "Egg", id: "egg", width: 411, height: 49.17, thickness: 10, offsetTop: 6.13},
        bacon: {name: "Bacon", id: "bacon", width: 551.07, height: 52.56, thickness: 12, offsetTop: 0},
        cheese: {name: "Cheese", id: "cheese", width: 470, height: 40, thickness: 6, offsetTop: 0}
    }

    //topBun isn't a layer that can be added
    const breadOrder = ["bun"];
    const pattyOrder = ["patty"];
    const vegOrder = ["lettuce", "tomato", "onionSlices", "pickles"];
    const extraOrder = ["egg", "bacon", "cheese"];

    const layerMaker = makePartsEntry("/parts/burger");

    const parts = {
        maxWidth: 600,
        structure: {
            //The layer to have things added to by default (non-static)
            //defaultActiveSectionIdx: 1,
            defaultActiveSectionIdx: 3,
            //prev and next are the indexes of the prev/next editable section
            sections: [
                {   isStatic: true,
                    prevIdx: null,
                    nextIdx: null,
                    layerIds: ["bottomBun"],
                    height: allParts["bottomBun"].thickness
                },
                {   isStatic: false,
                    prevIdx: null,
                    nextIdx: 3,
                    layerIds: [],
                    height: 0
                },
                {   isStatic: true,
                    prevIdx: null,
                    nextIdx: null,
                    layerIds:["bun", "patty"],
                    height: allParts["bun"].thickness + allParts["patty"].thickness
                },
                {   isStatic: false,
                    prevIdx: 1,
                    nextIdx: 5,
                    layerIds: [],
                    height: 0
                },
                {   isStatic: true,
                    prevIdx: null,
                    nextIdx: null,
                    layerIds:["bun", "patty"],
                    height: allParts["bun"].thickness + allParts["patty"].thickness
                },
                {   isStatic: false,
                    prevIdx: 3,
                    nextIdx: null,
                    layerIds: [],
                    height: 0
                },
                {   isStatic: true,
                    prevIdx: null,
                    nextIdx: null,
                    layerIds: ["topBun"],
                    height: allParts["topBun"].thickness
                }
            ]
            /*
            sections: [
                {   isStatic: true,
                    layerIds: ["bottomBun"]
                },
                {   isStatic: false,
                    prevIdx: null,
                    nextIdx: null,
                    layerIds: []
                },
                {   isStatic: true,
                    layerIds: ["topBun"]
                }
            ]
                    */
        },

        groupOrder: ["vegetables", "patty", "extra", "bread"],

        allParts: Object.fromEntries(Object.entries(allParts).map( ([key, value]) => [key, layerMaker(value)])),

        groups: {
            bread: {name: "bread", parts: breadOrder},
            patty: {name: "patty", parts: pattyOrder},
            vegetables: {name: "vegetables", parts: vegOrder},
            extra: {name: "extra", parts: extraOrder},
        }
    }

    res.json(parts);
})

app.listen(8080, () => {
    console.log("Server started o port 8080");
})
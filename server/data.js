const burgerLayers = {
    type: "unique",
    layers: {
        veg : [
            {name: "Lettuce", imgName: "lettuce", width: 470, height: 10, thickness: 10, offsetTop: 0},
            {name: "Tomato", imgName: "tomato", width: 467, height: 20, thickness: 20, offsetTop: 0},
            {name: "Onion Slices", imgName: "onionSlices", width: 420, height: 10, thickness: 10, offsetTop: 0},
            {name: "Pickles", imgName: "pickles", width: 456, height: 12, thickness: 6, offsetTop: 0}
        ],
        patty : [
            {name: "Patty", imgName: "patty", width: 450, height: 85, thickness: 85, offsetTop: 0},
            {name: "Breaded Chicken", imgName: "breaded Chicken", width: 450, height: 70, thickness: 85, offsetTop: 0},
            {name: "Veggie Burger", imgName: "veggieBurger", width: 450, height: 40, thickness: 40, offsetTop: 0}
        ],

        bread : [
            {name: "Bottom Bun", imgName: "bottomBun", width: 440, height: 60, thickness: 60, offsetTop: 0},
            {name: "Top Bun", imgName: "topBun", width: 440, height: 95, thickness: 95, offsetTop: 0}
        ],

        extra : [
            {name: "Egg", imgName: "egg", width: 411, height: 49.17, thickness: 10, offsetTop: 5.7},
            {name: "Bacon", imgName: "bacon", width: 551.07, height: 52.56, thickness: 12, offsetTop: 0},
            {name: "Cheese", imgName: "cheese", width: 470, height: 40, thickness: 6, offsetTop: 0}
        ]
    }
}

const chickenBurgers = [
    {
        name: "Crispy Chicken",
        ingredients: ["breadedChicken", "tomato", "lettuce", "mayo"]
    }
]

const condiments = {
    type: "standard",
    dimensions: {
        height: 6,
        width: 6,
        thickness: 6,
        offsetTop: 0,
    },
    names: ["Ketchup", "Mustard", "Mayo", "Bbq Sauce", "Hot Sauce", "Peri Peri Sauce"],
}

const dip = {
    dimensions: {
        height: 80,
        width: 50,
    },
    names: ["Chicken Dip", "Spicy Dip", "Garlic Dip", "Honey Dip", "Sweet and Sour Dip"]
}
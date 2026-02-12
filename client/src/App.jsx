import Home from "./pages/Home"
import CreateMeal from "./pages/CreateOrder"

import { Routes, Route } from "react-router"

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/createOrder" element={<CreateMeal />} />
        </Routes>
    )
}
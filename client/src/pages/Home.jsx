import { Link } from 'react-router'

export default function Home() {
    return (
        <main>
            <img className="side-banner" src="/src/images/full/standard_burger.png" alt="Image of a standard burger"></img>
            <Link to="/CreateOrder">Create order</Link>            
        </main>
    )
}
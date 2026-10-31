import { useEffect, useState } from "react";

function TestProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("https://dummyjson.com/products?limit=100")
      .then(response => response.json())
      .then(data => {
        setProducts(data.products);
      })
      .catch(error => {
        console.log("Error:", error);
      });
  }, []);

  return (
    <div>
      <h1>Products from DummyJSON</h1>

      {products.map(product => (
        <div key={product.id}>
          <img
            src={product.thumbnail}
            width="150"
            alt={product.title}
          />
          <h3>{product.title}</h3>
          <p>Price: ${product.price}</p>
        </div>
      ))}
    </div>
  );
}

export default TestProducts;

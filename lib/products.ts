export type Product = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  image?: string;
  accent: string;
  category: "cerveza" | "licor" | "bebida" | "otro";
};

export const PRODUCTS: Product[] = [
  { id: "salvavida", name: "Salvavida", price: 35, emoji: "🍺", image: "/products/salvavida.png", accent: "#e63946", category: "cerveza" },
  { id: "ultra", name: "Ultra", price: 50, emoji: "🍺", image: "/products/ultra.png", accent: "#c9a227", category: "cerveza" },
  { id: "barena", name: "Barena", price: 35, emoji: "🍺", image: "/products/barena.png", accent: "#1d4ed8", category: "cerveza" },
  { id: "imperial", name: "Imperial", price: 35, emoji: "🍺", image: "/products/imperial.png", accent: "#0f766e", category: "cerveza" },
  { id: "tequila", name: "Tequila Shot", price: 80, emoji: "🥃", accent: "#b45309", category: "licor" },
  { id: "vodka", name: "Vodka Cranberry", price: 80, emoji: "🍹", accent: "#be123c", category: "licor" },
  { id: "refresco", name: "Refresco Lata", price: 30, emoji: "🥤", image: "/products/refresco.png", accent: "#dc2626", category: "bebida" },
  { id: "agua", name: "Agua en Botella", price: 25, emoji: "🌊", accent: "#0284c7", category: "bebida" },
  { id: "cigarros", name: "Cigarro", price: 5, emoji: "🚬", accent: "#525252", category: "otro" },
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

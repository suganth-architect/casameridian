export type MenuItem = {
    name: string;
    price: number;
    isVeg: boolean;
    isAvailable?: boolean;
    description?: string;
};

export type MenuSection = {
    title: string;
    items: MenuItem[];
};

export type MenuCategory = {
    title: string;
    sections: MenuSection[];
};

export const MENU_CATEGORIES: MenuCategory[] = [
    {
        title: "Seafood & Mains",
        sections: [
            {
                title: "Starters",
                items: [
                    { name: "Vanjaram Fish Fry", price: 650, isVeg: false },
                    { name: "Prawn Pepper Fry", price: 600, isVeg: false },
                    { name: "Squid Milagu Roast", price: 550, isVeg: false },
                    { name: "Country Chicken Pepper Fry", price: 450, isVeg: false },
                    { name: "Chicken 65", price: 420, isVeg: false },
                    { name: "Chicken Tikka", price: 450, isVeg: false },
                    { name: "Tawa Fish", price: 650, isVeg: false, description: "If available" },
                ],
            },
            {
                title: "Veg Starters / Snacks",
                items: [
                    { name: "Paneer Tikka", price: 515, isVeg: true },
                    { name: "Potato Wedges", price: 325, isVeg: true },
                    { name: "Avocado Toast", price: 515, isVeg: true },
                    { name: "French Toast", price: 325, isVeg: true },
                    { name: "Vegetable Salad", price: 325, isVeg: true },
                ],
            },
            {
                title: "Mains",
                items: [
                    { name: "Meen Kuzhambu", price: 550, isVeg: false },
                    { name: "Prawn Thokku", price: 600, isVeg: false },
                    { name: "Chicken Chettinad", price: 480, isVeg: false },
                    { name: "Egg Masala", price: 260, isVeg: false },
                    { name: "Paneer Butter Masala", price: 485, isVeg: true },
                ],
            },
        ],
    },
    {
        title: "Rice, Tiffin & Snacks",
        sections: [
            {
                title: "Rice & Breads",
                items: [
                    { name: "Jeera Rice", price: 195, isVeg: true },
                    { name: "Steamed Rice", price: 145, isVeg: true },
                    { name: "Curd Rice", price: 235, isVeg: true },
                    { name: "Parotta", price: 80, isVeg: true },
                    { name: "Chapati", price: 60, isVeg: true },
                ],
            },
            {
                title: "Rice & Noodles (Classic / Schezwan)",
                items: [
                    { name: "Veg", price: 325, isVeg: true },
                    { name: "Egg", price: 375, isVeg: false },
                    { name: "Chicken", price: 400, isVeg: false },
                    { name: "Seafood", price: 450, isVeg: false },
                    { name: "Mixed", price: 500, isVeg: false },
                ],
            },
            {
                title: "Biryani",
                items: [
                    { name: "Veg Biryani (Subzi)", price: 350, isVeg: true },
                    { name: "Chicken Biryani", price: 400, isVeg: false },
                    { name: "Mutton Biryani", price: 495, isVeg: false },
                ],
            },
            {
                title: "South Indian Tiffin & Snacks",
                items: [
                    { name: "Idly (2 pcs)", price: 120, isVeg: true },
                    { name: "Dosa", price: 150, isVeg: true },
                    { name: "Bajji / Bonda", price: 150, isVeg: true },
                    { name: "Kuzhi Paniyaram", price: 180, isVeg: true },
                ],
            },
            {
                title: "Quick Bites",
                items: [
                    { name: "Tea", price: 50, isVeg: true },
                    { name: "Coffee", price: 70, isVeg: true },
                    { name: "Maggi", price: 120, isVeg: true },
                    { name: "Bread Omelette / French Fries", price: 150, isVeg: false },
                ],
            },
            {
                title: "Add-ons",
                items: [
                    { name: "Sambar", price: 215, isVeg: true },
                    { name: "Rasam", price: 215, isVeg: true },
                    { name: "Milagu Rasam", price: 215, isVeg: true },
                ],
            },
        ],
    },
];

export const MENU_NOTES = [
    "Kindly place orders together for smooth service.",
    "Desserts available on request.",
];

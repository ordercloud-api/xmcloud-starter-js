import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Auth,
  Catalogs,
  Categories,
  Configuration,
  PriceSchedules,
  Products,
  Specs,
  Tokens,
} from "ordercloud-javascript-sdk";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");

const loadDotEnv = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
};

loadDotEnv(path.join(rootDir, ".env"));

const apiBaseUrl = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL || "https://sandboxapi.ordercloud.io").replace(/\/$/, "");
const clientId = process.env.MIDDLEWARE_CLIENT_ID;
const clientSecret = process.env.MIDDLEWARE_CLIENT_SECRET;
const catalogId = "nike-shoes-demo-catalog";
const catalogName = "Nike Shoes Demo Catalog";
const rootCategoryId = "nike-shoes-demo-category";
const rootCategoryName = "Nike Shoes Demo Catalog";
const categoryDefinitions = [
  { id: rootCategoryId, name: rootCategoryName },
  { id: "nike-apparel-demo-category", name: "Nike Apparel Demo" },
  { id: "nike-accessories-demo-category", name: "Nike Accessories Demo" },
];
const dryRun = process.env.DRY_RUN === "1";

Configuration.Set({ baseApiUrl: apiBaseUrl });

const safeError = (error) => ({
  status: error?.status,
  message: error instanceof Error ? error.message : String(error),
  errors: error?.errors,
});

const request = async (label, operation, payload) => {
  if (dryRun) {
    console.log(`[DRY_RUN] ${label}`);
    if (payload !== undefined) console.log(JSON.stringify(payload));
    return undefined;
  }

  try {
    return await operation();
  } catch (error) {
    console.error(`[seed] ${label} failed`, safeError(error));
    throw error;
  }
};

const option = (id, value, listOrder, extra = {}) => ({
  ID: id,
  Value: value,
  ListOrder: listOrder,
  ...extra,
});

const product = (id, name, description, image, brand, category, price) => ({
  id,
  body: {
    ID: id,
    Name: name,
    Description: description,
    Active: true,
    xp: {
      Brand: brand,
      Category: category,
      Price: price,
      Images: [{ Url: image, Thumbnailurl: image, Primary: true }],
    },
  },
  price,
});

const products = [
  product(
    "aj1-love-letter-201",
    "Air Jordan 1 Retro High OG Love Letter",
    "High-top heritage silhouette in nubuck leather and suede, Shadow Brown/Light British Tan/Team Red colorway. Style DZ5485-201.",
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/ba9f162a-46d1-4ba9-a321-3c267773fb51/AIR+JORDAN+1+RETRO+HIGH+OG.png",
    "Jordan",
    "Basketball Lifestyle",
    185,
  ),
  product(
    "ava-edge-001",
    "Nike Ava Edge",
    "Lifestyle sneaker with a woven/mesh upper and oversized SCF foam midsole, built for city wear. Wolf Grey/Racer Blue/Vast Grey. Style IM1973-001.",
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/89ae04bf-6320-42c4-8ebd-aa5575bc0c80/NIKE+AVA+EDGE.png",
    "Nike",
    "Lifestyle",
    155,
  ),
  product(
    "air-max-90-317",
    "Nike Air Max 90",
    "Classic 90s running-inspired silhouette with Waffle outsole and visible Max Air cushioning. Black Spruce/Vintage Green/Fir/Summit White. Style IX4089-317.",
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/5ae089bf-92f4-48fb-8ca7-eac10bce4faf/AIR+MAX+90.png",
    "Nike",
    "Lifestyle",
    135,
  ),
  product(
    "vomero-premium-200",
    "Nike Vomero Premium",
    "Max-cushioned road running shoe with dual Air Zoom units and a full-length ZoomX midsole. Desert Khaki/Light Khaki/Coconut Milk/Reflect Silver. Style IM8334-200.",
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/9495e99e-3613-435d-a002-fca8f2bde5cd/NIKE+VOMERO+PREMIUM+ESS.png",
    "Nike",
    "Running",
    230,
  ),
  product(
    "free-metcon-7-amp-001",
    "Nike Free Metcon 7 AMP",
    "Versatile training shoe with Nike Free flex zones, webbed midfoot lacing, and a durable rubber outsole for multi-surface traction. Black/Hyper Punch/Indigo Burst/Metallic Platinum. Style IR0278-001.",
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/b2c4690c-2fe3-4be6-bc6f-eb0cfb9dfe3c/NIKE+FREE+METCON+7+AMP.png",
    "Nike",
    "Training",
    135,
  ),
  product(
    "jordan-heir-2-birds-001",
    "Jordan Heir Series 2 Birds of Paradise",
    "WNBA-inspired basketball shoe with a translucent netted outsole, external support cage, and a detachable heel hairband. Black/Metallic Gold/Total Orange/Coconut Milk. Style II0568-001.",
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/1302fc55-cbdf-41d2-996b-43bf86136228/WMNS+JORDAN+HEIR+SERIES+2+WNBA.png",
    "Jordan",
    "Basketball",
    120,
  ),
  product(
    "book-2-tiger-camo-001",
    "Book 2 Tiger Camo",
    "Signature basketball shoe with an all-over tiger camo print, forefoot Air Zoom unit, and herringbone traction pattern. Black/Total Orange/Flax/Black. Style IM4669-001.",
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/f19e2d24-ce77-40d9-9e73-87fd347fb861/BOOK+2+CAMO.png",
    "Jordan",
    "Basketball",
    145,
  ),
  product(
    "air-force-1-low-by-you-900",
    "Nike Air Force 1 Low By You",
    "Custom men's shoes with configurable leather, outsole and personal backtab text. Style HF0659-900.",
    "https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/6c612c89-2271-4ed1-b80c-3c2246c69bd7/AIR+FORCE+1+LOW+ESS+NBY+LEA.png",
    "Nike",
    "Custom Lifestyle",
    140,
  ),
  product(
    "dri-fit-running-top-254",
    "Nike Dri-FIT Run Club Top",
    "Roomy short-sleeve running top in sweat-wicking recycled polyester, adapted with optional run-club personalization. Medium Ash/Black. Style IU8957-254.",
    "https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/0f244bfd-22f8-40d4-9625-85b03b5cdce0/M+NK+DF+INL+DSRPT+SS+TOP.png",
    "Nike",
    "Running Apparel",
    75,
  ),
  product(
    "brasilia-duffel-40l-459",
    "Nike Brasilia Training Duffel Bag",
    "Small 40L training duffel with multiple pockets, a ventilated side compartment and adjustable carry options. Style IB4394-459.",
    "https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/0f19029b-8b90-4f60-9016-1009b5cd66bf/NK+BRSLA+S+DUFF+-+X.png",
    "Nike",
    "Training Accessories",
    45,
  ),
];

const specs = [
  // Scenario 1: pure customization specs with no generated variants.
  {
    productId: "air-max-90-317",
    id: "AM90-LACE-PACK",
    body: {
      Name: "Extra Lace Pack",
      ListOrder: 10,
      xp: {
        presentation: {
          control: "cards",
          label: "Extra lace pack",
          helpText: "Add a second lace color to change up the Black Spruce colorway.",
        },
      },
    },
    options: [
      option("NO-EXTRA-LACES", "No Extra Laces", 10, {
        xp: {
          presentation: {
            label: "Original laces",
            description: "The standard Vintage Green laces included with the shoe",
          },
        },
      }),
      option("SUMMIT-WHITE", "Summit White Lace Pack", 20, {
        PriceMarkupType: "AmountPerQuantity",
        PriceMarkup: 6,
        xp: {
          presentation: {
            label: "Summit White",
            description: "A bright contrast lace set",
            badge: "Optional",
          },
        },
      }),
      option("BLACK-SPRUCE", "Black Spruce Lace Pack", 30, {
        PriceMarkupType: "AmountPerQuantity",
        PriceMarkup: 6,
        xp: {
          presentation: {
            label: "Black Spruce",
            description: "A tonal replacement lace set",
            badge: "Optional",
          },
        },
      }),
    ],
    defaultOptionId: "NO-EXTRA-LACES",
  },
  {
    productId: "air-max-90-317",
    id: "AM90-GIFT-NOTE",
    body: {
      Name: "Gift Note",
      ListOrder: 20,
      AllowOpenText: true,
      xp: {
        presentation: {
          textControl: "textarea",
          label: "Gift note",
          helpText: "Optional message printed on a card inside the shoe box.",
          placeholder: "Enjoy your new Air Max 90.",
        },
        validation: { maxLength: 120 },
      },
    },
  },
  // Scenario 2: every size/color permutation is an active variant.
  {
    productId: "ava-edge-001",
    id: "AVA-EDGE-SIZE",
    body: {
      Name: "Women's Size",
      ListOrder: 10,
      Required: true,
      DefinesVariant: true,
      xp: {
        presentation: {
          control: "buttons",
          label: "Select size",
          helpText: "US women's sizing.",
        },
      },
    },
    options: ["6", "7", "8", "9", "10", "11"].map((value, i) => option(`W-${value}`, value, (i + 1) * 10)),
    defaultOptionId: "W-8",
  },
  {
    productId: "ava-edge-001",
    id: "AVA-EDGE-COLOR",
    body: {
      Name: "Color",
      ListOrder: 20,
      Required: true,
      DefinesVariant: true,
      xp: {
        presentation: {
          control: "swatches",
          label: "Color",
          helpText: "Both colorways are offered in every listed size.",
        },
      },
    },
    options: [
      option("WOLF-GREY", "Wolf Grey/Racer Blue", 10, {
        xp: {
          presentation: {
            label: "Wolf Grey",
            color: "#A7A9AC",
            badge: "Shown",
          },
        },
      }),
      option("SAIL-BLACK", "Sail/Black/Light Orewood Brown", 20, {
        xp: { presentation: { label: "Sail", color: "#E8E1D5" } },
      }),
    ],
    defaultOptionId: "WOLF-GREY",
  },
  // Scenario 3: generated size/color variants with selected combinations disabled.
  {
    productId: "free-metcon-7-amp-001",
    id: "FREE-METCON-7-SIZE",
    body: {
      Name: "Men's Size",
      ListOrder: 10,
      Required: true,
      DefinesVariant: true,
      xp: {
        presentation: {
          control: "buttons",
          label: "Select size",
          helpText: "US men's sizing.",
        },
      },
    },
    options: ["7", "8", "9", "10", "11", "12"].map((value, i) => option(`M-${value}`, value, (i + 1) * 10)),
    defaultOptionId: "M-10",
  },
  {
    productId: "free-metcon-7-amp-001",
    id: "FREE-METCON-7-COLOR",
    body: {
      Name: "Color",
      ListOrder: 20,
      Required: true,
      DefinesVariant: true,
      xp: {
        presentation: {
          control: "swatches",
          label: "Color",
          helpText: "Availability varies by size.",
        },
      },
    },
    options: [
      option("BLACK-HYPER-PUNCH", "Black/Hyper Punch/Indigo Burst", 10, {
        xp: {
          presentation: { label: "Black", color: "#171717", badge: "Shown" },
        },
      }),
      option("WHITE-VOLT", "White/Volt/Photon Dust", 20, {
        xp: { presentation: { label: "White/Volt", color: "#F2F1EA" } },
      }),
    ],
    defaultOptionId: "BLACK-HYPER-PUNCH",
  },
  {
    productId: "aj1-love-letter-201",
    id: "AJ1-LOVE-LETTER-SIZE",
    body: { Name: "Men's Size", ListOrder: 10, Required: true, DefinesVariant: true, xp: { presentation: { control: "buttons", label: "Select size", helpText: "US men's sizing. Choose your usual size for a snug, true-to-size fit." } } },
    options: [["M-8", "M 8 / W 9.5"], ["M-8-5", "M 8.5 / W 10"], ["M-9", "M 9 / W 10.5"], ["M-9-5", "M 9.5 / W 11"], ["M-10", "M 10 / W 11.5"], ["M-10-5", "M 10.5 / W 12"], ["M-11", "M 11 / W 12.5"], ["M-12", "M 12 / W 13.5"]].map(([id, value], i) => option(id, value, (i + 1) * 10)),
    defaultOptionId: "M-10",
  },
  {
    productId: "aj1-love-letter-201",
    id: "AJ1-LOVE-LETTER-COLORWAY",
    body: { Name: "Colorway", ListOrder: 20, Required: true, DefinesVariant: true, xp: { presentation: { control: "swatches", label: "Colorway", helpText: "The original Love Letter palette is selected by default." } } },
    options: [
      option("SHADOW-BROWN", "Shadow Brown/Team Red", 10, { xp: { presentation: { label: "Shadow Brown", description: "Shadow Brown, Light British Tan and Team Red", color: "#59483F", badge: "Shown" } } }),
      option("TEAM-RED", "Team Red/Sail", 20, { PriceMarkupType: "AmountTotal", PriceMarkup: 10, xp: { presentation: { label: "Team Red", description: "Team Red with Sail accents", color: "#9E1B32", badge: "Limited" } } }),
      option("SAIL", "Sail/Light British Tan", 30, { xp: { presentation: { label: "Sail", description: "Warm neutral leather and suede", color: "#EEE9DA" } } }),
    ],
    defaultOptionId: "SHADOW-BROWN",
  },
  {
    productId: "aj1-love-letter-201",
    id: "AJ1-LOVE-LETTER-FIT",
    body: { Name: "Fit Preference", ListOrder: 30, xp: { presentation: { control: "radio", label: "Fit preference", helpText: "Optional comfort setup added for storefront testing." } } },
    options: [
      option("STANDARD", "Standard", 10, { xp: { presentation: { description: "Original insole and factory lacing" } } }),
      option("ROOMY", "Roomy", 20, { PriceMarkupType: "AmountPerQuantity", PriceMarkup: 8, xp: { presentation: { description: "Lower-profile comfort insole for extra room", badge: "Wide-foot friendly" } } }),
    ],
  },
  {
    productId: "air-force-1-low-by-you-900",
    id: "AF1-BY-YOU-SIZE",
    body: { Name: "Men's Size", ListOrder: 10, Required: true, DefinesVariant: true, xp: { presentation: { control: "dropdown", label: "Men's size", helpText: "US men's sizing" } } },
    options: ["6", "7", "8", "9", "10", "11", "12", "13"].map((value, i) => option(value, value, (i + 1) * 10)),
    defaultOptionId: "10",
  },
  {
    productId: "air-force-1-low-by-you-900",
    id: "AF1-BY-YOU-UPPER",
    body: { Name: "Upper Material", ListOrder: 20, Required: true, DefinesVariant: true, xp: { presentation: { control: "cards", label: "Choose your upper", helpText: "Start with a classic leather base or add a premium finish." } } },
    options: [
      option("SMOOTH-LEATHER", "Smooth Leather", 10, { xp: { presentation: { label: "Smooth leather", description: "Clean, classic AF1 finish", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/42b73402-ca4d-4a01-8453-5f2786d4ef97/AIR+FORCE+1+LOW+ESS+NBY+LEA.png", badge: "Classic" } } }),
      option("RIPPLED-LEATHER", "Rippled Leather", 20, { PriceMarkupType: "AmountTotal", PriceMarkup: 10, xp: { presentation: { label: "Rippled leather", description: "Textured premium panels", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/318da3e1-037d-4c7e-8e62-8e8679041b3c/AIR+FORCE+1+LOW+ESS+NBY+LEA.png", badge: "Premium" } } }),
      option("CANVAS", "Canvas", 30, { PriceMarkupType: "Percentage", PriceMarkup: -5, xp: { presentation: { label: "Canvas", description: "Lightweight woven upper", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/9ee94934-b812-486e-a256-c386e2e243ac/AIR+FORCE+1+LOW+ESS+NBY+LEA.png" } } }),
    ],
    defaultOptionId: "SMOOTH-LEATHER",
  },
  {
    productId: "air-force-1-low-by-you-900",
    id: "AF1-BY-YOU-OUTSOLE",
    body: { Name: "Outsole", ListOrder: 30, Required: true, DefinesVariant: true, xp: { presentation: { control: "images", label: "Outsole finish", helpText: "Preview a traditional, gum or translucent sole." } } },
    options: [
      option("SOLID", "Solid Rubber", 10, { xp: { presentation: { label: "Solid", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/6c612c89-2271-4ed1-b80c-3c2246c69bd7/AIR+FORCE+1+LOW+ESS+NBY+LEA.png" } } }),
      option("GUM", "Gum Rubber", 20, { PriceMarkupType: "AmountTotal", PriceMarkup: 5, xp: { presentation: { label: "Gum", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/fcfeb3c8-63c3-4383-b022-ce3a91332f6d/AIR+FORCE+1+LOW+ESS+NBY+LEA.png", badge: "Heritage" } } }),
      option("TRANSLUCENT", "Translucent Rubber", 30, { PriceMarkupType: "AmountTotal", PriceMarkup: 8, xp: { presentation: { label: "Translucent", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/122acb83-0f2c-4c2d-89cd-e81ae9cd3b7a/AIR+FORCE+1+LOW+ESS+NBY+LEA.png" } } }),
    ],
    defaultOptionId: "SOLID",
  },
  {
    productId: "air-force-1-low-by-you-900",
    id: "AF1-BY-YOU-HEEL",
    body: { Name: "Heel Detail", ListOrder: 40, Required: true, xp: { presentation: { control: "buttons", textControl: "text", label: "Backtab detail", helpText: "Choose the classic Nike Air logo or enter up to 3 characters.", placeholder: "ABC", suffix: "3 characters max" }, validation: { minLength: 1, maxLength: 3 } } },
    options: [
      option("NIKE-AIR", "Nike Air Logo", 10, { xp: { presentation: { label: "Nike Air", description: "Classic embroidered backtab" } } }),
      option("CUSTOM-TEXT", "Custom Text", 20, { IsOpenText: true, PriceMarkupType: "AmountTotal", PriceMarkup: 8, xp: { presentation: { label: "Your text", description: "Personalized embroidery", badge: "Make it yours" } } }),
    ],
    defaultOptionId: "NIKE-AIR",
  },
  {
    productId: "dri-fit-running-top-254",
    id: "DRI-FIT-TOP-SIZE",
    body: { Name: "Size", ListOrder: 10, Required: true, DefinesVariant: true, xp: { presentation: { control: "buttons", label: "Select size", helpText: "Roomy, boxy fit. Choose your usual Nike apparel size." } } },
    options: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"].map((value, i) => option(value, value, (i + 1) * 10)),
    defaultOptionId: "M",
  },
  {
    productId: "dri-fit-running-top-254",
    id: "DRI-FIT-TOP-RUNNER-NAME",
    body: { Name: "Runner Name", ListOrder: 20, AllowOpenText: true, xp: { presentation: { textControl: "text", label: "Runner name", helpText: "Optional name printed across the upper back.", placeholder: "MORGAN", prefix: "Name" }, validation: { minLength: 2, maxLength: 12 } } },
  },
  {
    productId: "dri-fit-running-top-254",
    id: "DRI-FIT-TOP-RACE-NUMBER",
    body: { Name: "Race Number", ListOrder: 30, AllowOpenText: true, xp: { presentation: { textControl: "number", label: "Race number", helpText: "Optional whole number printed below the runner name.", placeholder: "26", prefix: "#" }, validation: { min: 1, max: 999, step: 1 } } },
  },
  {
    productId: "dri-fit-running-top-254",
    id: "DRI-FIT-TOP-TRAINING-NOTE",
    body: { Name: "Print Notes", ListOrder: 40, AllowOpenText: true, xp: { presentation: { textControl: "textarea", label: "Print notes", helpText: "Optional placement or capitalization notes for the print team.", placeholder: "Use all caps and center the name above the number." }, validation: { maxLength: 120 } } },
  },
  {
    productId: "dri-fit-running-top-254",
    id: "DRI-FIT-TOP-EVENT-DATE",
    body: { Name: "Event Date", ListOrder: 50, AllowOpenText: true, xp: { presentation: { textControl: "date", label: "Event date", helpText: "Optional. Helps the print team prioritize upcoming races.", suffix: "race day" }, validation: { minDate: "today", maxDate: "2028-12-31" } } },
  },
  {
    productId: "brasilia-duffel-40l-459",
    id: "BRASILIA-40L-COLOR",
    body: { Name: "Color", ListOrder: 10, Required: true, DefinesVariant: true, xp: { presentation: { control: "swatches", label: "Bag color", helpText: "Choose from current Nike Brasilia-inspired colors." } } },
    options: [
      option("INDIGO-STORM", "Indigo Storm/Black", 10, { xp: { presentation: { label: "Indigo Storm", color: "#31566F", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/85af0ecb-90e6-4705-996b-7371032179f8/NK+BRSLA+S+DUFF+-+X.png", badge: "Shown" } } }),
      option("BLACK", "Black/Black/White", 20, { xp: { presentation: { label: "Black", color: "#111111", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/8447ce0a-4fe3-4112-ae1a-3dbe438f7f5c/NK+BRSLA+S+DUFF+-+X.png", badge: "Best seller" } } }),
      option("GAME-ROYAL", "Game Royal/Black/White", 30, { xp: { presentation: { label: "Game Royal", color: "#1D4E9E", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/cb76bdfc-bec3-4b81-a382-e31f7200cb61/NK+BRSLA+S+DUFF+-+X.png" } } }),
      option("LIGHT-MAGENTA", "Light Magenta/Black", 40, { xp: { presentation: { label: "Light Magenta", color: "#D96C9D", imageUrl: "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/b9e3968e-4ef1-49ae-b652-74fec933d097/NK+BRSLA+S+DUFF+-+X.png" } } }),
    ],
    defaultOptionId: "INDIGO-STORM",
  },
  {
    productId: "brasilia-duffel-40l-459",
    id: "BRASILIA-40L-STRAP",
    body: { Name: "Shoulder Strap", ListOrder: 20, Required: true, xp: { presentation: { control: "cards", label: "Shoulder strap", helpText: "Choose the standard webbing strap or add extra padding." } } },
    options: [
      option("STANDARD", "Standard Strap", 10, { xp: { presentation: { label: "Standard", description: "Adjustable woven strap included with the bag" } } }),
      option("PADDED", "Padded Strap", 20, { PriceMarkupType: "AmountPerQuantity", PriceMarkup: 6, xp: { presentation: { label: "Extra padded", description: "Removable shoulder pad for heavier loads", badge: "Comfort" } } }),
    ],
    defaultOptionId: "STANDARD",
  },
  {
    productId: "brasilia-duffel-40l-459",
    id: "BRASILIA-40L-MONOGRAM",
    body: { Name: "Monogram", ListOrder: 30, xp: { presentation: { control: "radio", textControl: "text", label: "Monogram", helpText: "Optional embroidered initials on the end panel.", placeholder: "MVP", prefix: "Initials", suffix: "up to 8 characters" }, validation: { minLength: 2, maxLength: 8 } } },
    options: [
      option("NO-MONOGRAM", "No Monogram", 10, { xp: { presentation: { label: "No monogram" } } }),
      option("CUSTOM-MONOGRAM", "Custom Monogram", 20, { IsOpenText: true, PriceMarkupType: "AmountPerQuantity", PriceMarkup: 12, xp: { presentation: { label: "Add a monogram", description: "Tone-on-tone embroidery", badge: "Personalized" } } }),
    ],
    defaultOptionId: "NO-MONOGRAM",
  },
];

const catalogScenarios = [
  { productId: "air-max-90-317", description: "pure specs (no variant specs)" },
  {
    productId: "ava-edge-001",
    description: "all variant specs, none disabled",
  },
  {
    productId: "free-metcon-7-amp-001",
    description: "all variant specs, selected combinations disabled",
  },
  {
    productId: "air-force-1-low-by-you-900",
    description: "mixed ordinary and variant specs",
  },
];

const disabledVariantCombinations = {
  "free-metcon-7-amp-001": [
    {
      "FREE-METCON-7-SIZE": "M-7",
      "FREE-METCON-7-COLOR": "WHITE-VOLT",
    },
    {
      "FREE-METCON-7-SIZE": "M-12",
      "FREE-METCON-7-COLOR": "BLACK-HYPER-PUNCH",
    },
  ],
};

const variantSpecsForProduct = (productId) => specs.filter((spec) => spec.productId === productId && spec.body.DefinesVariant === true);

const validateCatalogConfiguration = () => {
  for (const spec of specs) {
    if (spec.body.DefinesVariant === true && spec.body.Required !== true) {
      throw new Error(`Variant spec ${spec.id} must also be required.`);
    }
  }

  for (const scenario of catalogScenarios) {
    const productSpecs = specs.filter((spec) => spec.productId === scenario.productId);
    const variantSpecs = variantSpecsForProduct(scenario.productId);
    const ordinarySpecs = productSpecs.filter((spec) => spec.body.DefinesVariant !== true);
    const disabled = disabledVariantCombinations[scenario.productId] ?? [];
    const valid = (scenario.description === "pure specs (no variant specs)" && ordinarySpecs.length > 0 && variantSpecs.length === 0) || (scenario.description === "all variant specs, none disabled" && variantSpecs.length > 0 && ordinarySpecs.length === 0 && disabled.length === 0) || (scenario.description === "all variant specs, selected combinations disabled" && variantSpecs.length > 0 && ordinarySpecs.length === 0 && disabled.length > 0) || (scenario.description === "mixed ordinary and variant specs" && variantSpecs.length > 0 && ordinarySpecs.length > 0);
    if (!valid) {
      throw new Error(`Catalog scenario ${scenario.productId} is not configured as ${scenario.description}.`);
    }
  }

  for (const [productId, combinations] of Object.entries(disabledVariantCombinations)) {
    const variantSpecs = variantSpecsForProduct(productId);
    const expectedSpecIds = variantSpecs.map((spec) => spec.id).sort();
    for (const combination of combinations) {
      const actualSpecIds = Object.keys(combination).sort();
      if (JSON.stringify(actualSpecIds) !== JSON.stringify(expectedSpecIds)) {
        throw new Error(`Disabled variant for ${productId} must specify every variant spec.`);
      }
      for (const spec of variantSpecs) {
        if (!(spec.options ?? []).some((item) => item.ID === combination[spec.id])) {
          throw new Error(`Disabled variant for ${productId} references unknown option ${spec.id}/${combination[spec.id]}.`);
        }
      }
    }
  }
};

const listAllVariants = async (productId) => {
  const variants = [];
  let page = 1;
  while (true) {
    const response = await request(`list generated variants for ${productId}, page ${page}`, () => Products.ListVariants(productId, { page, pageSize: 100 }));
    const items = response?.Items ?? [];
    variants.push(...items);
    if (items.length < 100 || page >= (response?.Meta?.TotalPages ?? page)) {
      return variants;
    }
    page += 1;
  }
};

const variantMatches = (variant, combination) => {
  const actual = Object.fromEntries((variant.Specs ?? []).map((spec) => [spec.SpecID, spec.OptionID]));
  return Object.entries(combination).every(([specId, optionId]) => actual[specId] === optionId);
};

const seed = async () => {
  validateCatalogConfiguration();

  if (!dryRun && (!clientId || !clientSecret)) {
    throw new Error("Missing MIDDLEWARE_CLIENT_ID or MIDDLEWARE_CLIENT_SECRET. Set them in the environment or .env.");
  }

  if (!dryRun) {
    console.log("Authenticating with OrderCloud client credentials...");
    const token = await request("client credentials authentication", () => Auth.ClientCredentials(clientSecret, clientId));
    if (!token?.access_token) throw new Error("OrderCloud authentication returned no access token.");
    Tokens.SetAccessToken(token.access_token);
  }

  await request(`save catalog ${catalogId}`, () => Catalogs.Save(catalogId, { ID: catalogId, Name: catalogName, Active: true }), { ID: catalogId, Name: catalogName });
  for (const category of categoryDefinitions) {
    await request(`save category ${category.id}`, () => Categories.Save(catalogId, category.id, { ID: category.id, Name: category.name, Active: true }), category);
  }

  const expectedProductIds = new Set(products.map((item) => item.id));
  const assignments = await request(`list product assignments for ${catalogId}`, () => Catalogs.ListProductAssignments(catalogId, { pageSize: 100 }));
  for (const assignment of assignments?.Items ?? []) {
    if (assignment.CatalogID === catalogId && !expectedProductIds.has(assignment.ProductID)) {
      await request(`remove stale product ${assignment.ProductID} from ${catalogId}`, () => Catalogs.DeleteProductAssignment(catalogId, assignment.ProductID), assignment);
    }
  }

  for (const item of products) {
    console.log(`Upserting product: ${item.id}`);
    await request(`save product ${item.id}`, () => Products.Save(item.id, item.body), item.body);
    const priceScheduleId = `${item.id}-ps`;
    await request(`save price schedule ${priceScheduleId}`, () => PriceSchedules.Save(priceScheduleId, { ID: priceScheduleId, Name: `${item.body.Name} Price`, ApplyTax: false, UseCumulativeQuantity: false, RestrictedQuantity: false, MinQuantity: 1, PriceBreaks: [{ Quantity: 1, Price: item.price }] }), { ID: priceScheduleId, Price: item.price });
    await request(`patch product price ${item.id}`, () => Products.Patch(item.id, { DefaultPriceScheduleID: priceScheduleId }), { DefaultPriceScheduleID: priceScheduleId });
    const categoryId = item.body.xp.Category === "Running Apparel" ? "nike-apparel-demo-category" : item.body.xp.Category === "Training Accessories" ? "nike-accessories-demo-category" : rootCategoryId;
    await request(`assign product ${item.id} to ${categoryId}`, () => Categories.SaveProductAssignment(catalogId, { CategoryID: categoryId, ProductID: item.id }), { CategoryID: categoryId, ProductID: item.id });
  }

  for (const spec of specs) {
    console.log(`Upserting spec: ${spec.id} -> ${spec.productId}`);
    const specBody = { ID: spec.id, ...spec.body };
    await request(`save spec ${spec.id}`, () => Specs.Save(spec.id, specBody), specBody);
    for (const item of spec.options ?? []) await request(`save option ${spec.id}/${item.ID}`, () => Specs.SaveOption(spec.id, item.ID, item), item);
    if (spec.defaultOptionId) await request(`set default ${spec.id}`, () => Specs.Patch(spec.id, { DefaultOptionID: spec.defaultOptionId }), { DefaultOptionID: spec.defaultOptionId });
    await request(`assign spec ${spec.id} to ${spec.productId}`, () => Specs.SaveProductAssignment({ SpecID: spec.id, ProductID: spec.productId }), { SpecID: spec.id, ProductID: spec.productId });
  }

  const productsWithVariants = [...new Set(specs.filter((spec) => spec.body.DefinesVariant === true).map((spec) => spec.productId))];
  for (const productId of productsWithVariants) {
    await request(`generate variants for ${productId}`, () => Products.GenerateVariants(productId, { Active: true }, { overwriteExisting: true }), { productId, overwriteExisting: true, Active: true });

    const disabled = disabledVariantCombinations[productId] ?? [];
    if (dryRun) {
      for (const combination of disabled) {
        console.log(`[DRY_RUN] disable variant combination ${productId} ${JSON.stringify(combination)}`);
      }
      continue;
    }

    const generatedVariants = await listAllVariants(productId);
    for (const combination of disabled) {
      const matches = generatedVariants.filter((variant) => variantMatches(variant, combination));
      if (matches.length !== 1) {
        throw new Error(`Expected one generated variant for ${productId} ${JSON.stringify(combination)}, found ${matches.length}.`);
      }
      await request(`disable variant ${productId}/${matches[0].ID}`, () => Products.PatchVariant(productId, matches[0].ID, { Active: false }), { productId, variantId: matches[0].ID, combination, Active: false });
    }
  }

  console.log(`Seed complete. Catalog: ${catalogId}, Category: ${rootCategoryId}`);
  for (const scenario of catalogScenarios) {
    console.log(`Scenario: ${scenario.productId} - ${scenario.description}`);
  }
};

seed().catch((error) => {
  console.error("[seed] failed", safeError(error));
  process.exitCode = 1;
});

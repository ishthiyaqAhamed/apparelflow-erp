import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoUsers = [
  { email: "supervisor@apparelflow.com", fullName: "Nimali Perera", role: Role.cutting_supervisor },
  { email: "verifier@apparelflow.com", fullName: "Kasun Silva", role: Role.cutting_verifier },
  { email: "sewing@apparelflow.com", fullName: "Dilani Fernando", role: Role.sewing_supervisor },
];

async function main() {
  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
  }

  await prisma.recipe.upsert({
    where: { recipeCode: "REC-BL01" },
    update: {},
    create: {
      recipeCode: "REC-BL01",
      name: "Casual Blouse",
      category: "Blouse",
      stdFabricYards: 1.8,
      wastageCap: 5.0,
      components: {
        create: [
          { componentName: "Front Body Panel", piecesPerGarment: 1 },
          { componentName: "Back Body Panel", piecesPerGarment: 1 },
          { componentName: "Sleeves (Left & Right)", piecesPerGarment: 2 },
          { componentName: "Collar & Stand", piecesPerGarment: 1 },
          { componentName: "Sleeve Cuffs", piecesPerGarment: 2 },
        ],
      },
    },
  });

  await prisma.recipe.upsert({
    where: { recipeCode: "REC-CT02" },
    update: {},
    create: {
      recipeCode: "REC-CT02",
      name: "Crop Top",
      category: "Crop Top",
      stdFabricYards: 1.1,
      wastageCap: 8.0,
      components: {
        create: [
          { componentName: "Front Chest Panel", piecesPerGarment: 1 },
          { componentName: "Back Support Panel", piecesPerGarment: 1 },
          { componentName: "Neck Binding Strip", piecesPerGarment: 1 },
          { componentName: "Hem Elastic Casing", piecesPerGarment: 1 },
          { componentName: "Side Strap Accents", piecesPerGarment: 2 },
        ],
      },
    },
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
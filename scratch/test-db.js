const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.comment.create({
      data: {
        postSlug: "technology-and-art-oasis",
        nickname: "TestUser",
        contact: "test@gmail.com",
        avatar: "<svg></svg>",
        ip: "::1",
        location: "局域网/本地",
        content: "Hello World",
        status: "PENDING"
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

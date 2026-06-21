import dotenv from 'dotenv';
dotenv.config();

export default {
  schema: 'backend/prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

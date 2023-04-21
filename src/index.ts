import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { buildSchema } from "type-graphql";
import { HelloResolvers } from "./resolvers/hello";
import { PostResolvers } from "./resolvers/post";
import { UserResolvers } from "./resolvers/user";
import session from "express-session";
import RedisStore from "connect-redis";
import { expressMiddleware } from "@apollo/server/express4";
import bodyParser from "body-parser";
import Redis from "ioredis";
import { DataSource } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/Users";
import path from "path";
import { Updoot } from "./entities/Updoot";
import { CreateUserLoader } from "./utils/createUserLoader";
import { CreateUpdootLoader } from "./utils/createUpdootLoader";

const conn = new DataSource({
  type: "postgres",
  database: "reddit2",
  username: "postgres",
  password: "root",
  logging: true,
  synchronize: true,
  migrations: [path.join(__dirname, "./migrations/*")],
  //synchonization true will automatically create tables automatically for us without running a migration
  entities: [Post, User, Updoot],
});

// Initialize client.
const redis = new Redis();
redis.connect().catch(console.error);

// Initialize store.
// @ts-expect-error
const redisStore = new RedisStore({
  // @ts-expect-error
  client: redis,
  prefix: "myapp:",
});

async function main() {
  await conn.initialize();
  // await Post.delete({});
  await conn.runMigrations();

  //!! Mikro orm
  // const orm = await MikroORM.init(mikroConfig);
  // await RequestContext.createAsync(orm.em, async () => {
  //   await orm.getMigrator().up();
  // const post = await orm.em.find(Post,{})
  // console.log(post)

  const app = express();
  app.use(bodyParser.json({ limit: "50mb" }));

  app.use(
    session({
      name: COOKIE_NAME, //it defines the cokkie name
      store: redisStore,

      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true, //this is for security reason so what it will do is it will not allow you to acces the cokkie in the frontend js code
        secure: __prod__, // cookie only works in https
        sameSite: "none", //related to csrf google it it is complex
      },
      saveUninitialized: false,
      secret: "adnkjandkjankdnasdsjan",
      resave: false,
    })
  );

  const appoloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolvers, PostResolvers, UserResolvers],
      validate: false,
    }),
  });
  await appoloServer.start();

  app.use(
    "/graphql",
    expressMiddleware(appoloServer, {
      // @ts-ignore
      context: ({ req, res }) => {
        res.setHeader("Access-Control-Allow-Credentials", "true");

        return {
          req,
          res,
          redis,
          userLoader: CreateUserLoader(),
          updootLoader: CreateUpdootLoader(),
        };
      },
    })
  );

  app.listen(4000, () => {
    console.log("server started on localhost :4000");
  });
}

main().catch((err) => {
  console.error(err);
});

export default conn;

// if (!req.session.userId) {
//   throw new Error("not authenticated");
// }

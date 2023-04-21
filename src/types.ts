import { Request, Response } from "express";
import { Redis } from "ioredis";
import { CreateUserLoader } from "./utils/createUserLoader";
import { CreateUpdootLoader } from "./utils/createUpdootLoader";

export type MyContext = {
  // em: EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session: Express.Session };
  redis: Redis;
  res: Response;
  userLoader: ReturnType<typeof CreateUserLoader>;
  updootLoader: ReturnType<typeof CreateUpdootLoader>;
  // &sign in typescript joins both types together
};

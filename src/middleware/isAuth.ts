import { MyContext } from "../types";
import { MiddlewareFn } from "type-graphql/dist/interfaces/Middleware";

export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  if (!context.req.session.userId) {
    throw new Error("not authenticated");
  }

  return next();
};
// typegraphql has a middleware useMiddleware that we will use
// so How middleware works is it runs before your resolver(querys or mutations)

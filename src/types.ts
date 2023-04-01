import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request , Response } from "express";

export type MyContext = {
    em :EntityManager<IDatabaseDriver<Connection>>;
    req : Request & { session:Express.Session };
    res : Response ;
    // & sign in typescript joins both types together
}
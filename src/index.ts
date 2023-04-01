import "reflect-metadata"
import { MikroORM, RequestContext }  from "@mikro-orm/core"
import { __prod__ } from "./constants";
import mikroConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolvers } from "./resolvers/hello";
import { PostResolvers } from "./resolvers/post";
import { UserResolvers } from "./resolvers/user";
import redis from 'redis';
import session from "express-session";







// const redis = require('redis')

// var RedisStore = require('connect-redis')(session)
// var client = redis.createClient ();
// app.use(session({
//     store: new RedisStore({ client: client }),
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: true
// }))


async function main() {

    const orm = await MikroORM.init(mikroConfig);
    await RequestContext.createAsync(orm.em, async () => {
        await orm.getMigrator().up();
        // const post = await orm.em.find(Post,{})
        // console.log(post)
        const app = express();
        const RedisStore = require('connect-redis')(session);
        const redisClient = redis.createClient()

        app.use(
           session({
                  name:"qid", //it defines the cokkie name
                  store : new RedisStore({
                    client : redisClient,
                    disableTouch:true,
                  }),
                  cookie : {
                    maxAge : 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                    httpOnly:true,//this is for security reason so what it will do is it will not allow you to acces the cokkie in the frontend js code
                    secure:__prod__, // cookie only works in https
                    sameSite:'lax' , //related to csrf google it it is complex
                  },  
                  secret:'adnkjandkjankdnasdsjan',
                  resave:false,
               })
              )

        const appoloServer = new ApolloServer({
            schema: await buildSchema({
                resolvers: [HelloResolvers, PostResolvers, UserResolvers],
                validate: false
            }),
            context: ({req ,res })=> ({ em: orm.em , req , res }),
            //context is a special object that is accesible by all the resolvers we will use it so that our resolver 
            //can access orm.em where e m is which that is imp and which we want to access
        });
        await appoloServer.start();
        appoloServer.applyMiddleware({ app });

        // app.get('/',(_,res)=>{
        //     res.send("hello")
        // })
        app.listen(4000, () => {
            console.log("server started on localhost :4000");
        });
    });
}
   

main().catch((err)=>{
    console.error(err);
});

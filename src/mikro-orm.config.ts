import { MikroORM } from "@mikro-orm/postgresql";
import path from "path";
import { __prod__ } from "./constants"
import { Post } from "./entities/Post"
import { User} from "./entities/Users";

export default {
    migrations:{
        path:path.join(__dirname,"./migrations"),
        pattern:/^[\w-]+\d+\.[tj]s$/,
    }, 
    entities:[Post , User],
    dbName:"reddit",
    user:"postgres",
    password:"root",
    debug: !__prod__,
    type:"postgresql"
} as Parameters<typeof MikroORM.init>[0];
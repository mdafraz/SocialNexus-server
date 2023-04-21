"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("./constants");
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const type_graphql_1 = require("type-graphql");
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const user_1 = require("./resolvers/user");
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const express4_1 = require("@apollo/server/express4");
const body_parser_1 = __importDefault(require("body-parser"));
const ioredis_1 = __importDefault(require("ioredis"));
const typeorm_1 = require("typeorm");
const Post_1 = require("./entities/Post");
const Users_1 = require("./entities/Users");
const path_1 = __importDefault(require("path"));
const Updoot_1 = require("./entities/Updoot");
const createUserLoader_1 = require("./utils/createUserLoader");
const createUpdootLoader_1 = require("./utils/createUpdootLoader");
const conn = new typeorm_1.DataSource({
    type: "postgres",
    database: "reddit2",
    username: "postgres",
    password: "root",
    logging: true,
    synchronize: true,
    migrations: [path_1.default.join(__dirname, "./migrations/*")],
    entities: [Post_1.Post, Users_1.User, Updoot_1.Updoot],
});
const redis = new ioredis_1.default();
redis.connect().catch(console.error);
const redisStore = new connect_redis_1.default({
    client: redis,
    prefix: "myapp:",
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield conn.initialize();
        yield conn.runMigrations();
        const app = (0, express_1.default)();
        app.use(body_parser_1.default.json({ limit: "50mb" }));
        app.use((0, express_session_1.default)({
            name: constants_1.COOKIE_NAME,
            store: redisStore,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
                httpOnly: true,
                secure: constants_1.__prod__,
                sameSite: "none",
            },
            saveUninitialized: false,
            secret: "adnkjandkjankdnasdsjan",
            resave: false,
        }));
        const appoloServer = new server_1.ApolloServer({
            schema: yield (0, type_graphql_1.buildSchema)({
                resolvers: [hello_1.HelloResolvers, post_1.PostResolvers, user_1.UserResolvers],
                validate: false,
            }),
        });
        yield appoloServer.start();
        app.use("/graphql", (0, express4_1.expressMiddleware)(appoloServer, {
            context: ({ req, res }) => {
                res.setHeader("Access-Control-Allow-Credentials", "true");
                return {
                    req,
                    res,
                    redis,
                    userLoader: (0, createUserLoader_1.CreateUserLoader)(),
                    updootLoader: (0, createUpdootLoader_1.CreateUpdootLoader)(),
                };
            },
        }));
        app.listen(4000, () => {
            console.log("server started on localhost :4000");
        });
    });
}
main().catch((err) => {
    console.error(err);
});
exports.default = conn;
//# sourceMappingURL=index.js.map
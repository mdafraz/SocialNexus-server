"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Post_1 = require("../entities/Post");
const Users_1 = require("../entities/Users");
const typeorm_1 = require("typeorm");
const conn = new typeorm_1.DataSource({
    type: "postgres",
    database: "reddit2",
    username: "postgres",
    password: "root",
    logging: true,
    synchronize: true,
    entities: [Post_1.Post, Users_1.User],
});
exports.default = conn;
//# sourceMappingURL=type-ormconn.js.map
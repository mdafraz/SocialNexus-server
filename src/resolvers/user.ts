import argon2 from "argon2";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/Users";
import conn from "../index";
import { sendEmail } from "../utils/sendEmail";
import { validateRegister } from "../utils/validateRegister";
import { UsernamePasswordInput } from "./UsernamePasswordInput";

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolvers {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.UserId === user.id) {
      return user.email;
    }
    return "";
  }
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "length must be greater than 2",
          },
        ],
      };
    }
    const key = FORGOT_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "token expired",
          },
        ],
      };
    }

    // const user = await em.findOne(User, { id: parseInt(userId) });
    const userIdNum = parseInt(userId);
    const user = await User.findOneBy({ id: userIdNum });

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "user no longer exists",
          },
        ],
      };
    }

    // user.password = await argon2.hash(newPassword);
    // em.persistAndFlush(user);

    await User.update(
      { id: userIdNum },
      { password: await argon2.hash(newPassword) }
    );

    await redis.del(key);
    //log in user after password change
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    // const user = await em.findOne(User , {email})
    const user = await User.findOneBy({ email: email });
    if (!user) {
      return true;
    }
    const v4options = {
      random: [
        0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1,
        0x67, 0x1c, 0x58, 0x36,
      ],
    };
    const token = uuidv4(v4options);
    await redis.set(
      FORGOT_PASSWORD_PREFIX + token,
      user.id,
      "EX",
      1000 * 60 * 60 * 24 * 3
      //3 days
    );

    sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    //you are not logged in
    const userId = req.session.userId;
    console.log(userId);
    if (!userId) {
      return null;
    }
    const user = await User.find({
      where: {
        id: userId,
      },
    });
    console.log(user);

    // const user = await em.findOne(User, { id: userId });
    return user[0];
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const response = validateRegister(options);
    if (response) {
      return response;
    }
    const hashedpassword = await argon2.hash(options.password);

    // const user = em.create(User, {
    //   username: options.username,
    //   createdAt: "",
    //   updatedAt: "",
    //   password: hashedpassword,
    // });
    let user;
    try {
      //type Orm

      const result = await conn
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedpassword,
        })
        .returning("*")
        .execute();

      user = result.raw[0];
      //or we could have done this
      // User.create({
      //   username: options.username,
      //   email: options.email,
      //   password: hashedpassword,
      // }).save();
      //MIkRO ORM
      // const result = await (em as EntityManager)
      //   .createQueryBuilder(User)
      //   .getKnexQuery()
      //   .insert({
      //     username: options.username,
      //     email: options.email,
      //     password: hashedpassword,
      //     created_at: new Date(),
      //     updated_at: new Date(),
      //   })
      //   .returning("*");
      // user = result[0];
      //what is the value of result
      // was having error in below line thats why using querybuilder
      // await em.persistAndFlush(user);
    } catch (err) {
      if (err.code === "23505") {
        // || err.details.include("already exists")
        //duplicate username error
        return {
          errors: [
            {
              field: "username",
              message: "username already taken",
            },
          ],
        };
        //console.log(" message " , err.message);
      }
    }
    //store user id session
    //this will set a cokkie on the user
    //keep them logged in
    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") passsword: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    // const user = await em.findOne(
    //   User,
    //   usernameOrEmail.includes("@")
    //     ? { email: usernameOrEmail }
    //     : { username: usernameOrEmail }
    // );

    const user = await User.findOneBy(
      usernameOrEmail.includes("@")
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: " that username dosent exist ",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, passsword);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "incorrect password",
          },
        ],
      };
    }

    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    //req will clear the session in reddis
    //whereas res will clear the cokkie
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}

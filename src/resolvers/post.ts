import { MyContext } from "../types";
import { Post } from "../entities/Post";
//why import with ../ and not src/
import {
  Resolver,
  Query,
  Arg,
  Int,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  FieldResolver,
  Root,
  ObjectType,
} from "type-graphql";
import { isAuth } from "../middleware/isAuth";
import conn from "../index";
import { Updoot } from "../entities/Updoot";
import { error } from "console";
import { User } from "../entities/Users";
@InputType()
class PostInputs {
  @Field()
  title!: string;
  @Field()
  text!: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolvers {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 50);
  }

  @FieldResolver(() => User)
  async creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { updootLoader, req }: MyContext
  ) {
    if (!req.session.userId) {
      return null;
    }
    const updoot = await updootLoader.load({
      postId: post.id,
      userId: req.session.userId,
    });
    return updoot ? updoot.value : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;
    const updoot = await Updoot.findOne({ where: { postId, userId } });

    //user has voted before
    //and user now want to change their vote

    if (updoot && updoot.value !== realValue) {
      await conn.transaction(async (tm) => {
        await tm.query(
          `
          update updoot 
          set value = $1
          where "postId" = $2 and "userId" = $3       
        `,
          [realValue, postId, userId]
        );

        await tm.query(
          `
        update post 
        set points = points + $1
        where id =$2;
        `,
          [2 * realValue, postId]
        );
      });
    } else if (!updoot) {
      //has never voted before
      //catch the error and roll back trasaction if we get an error

      await conn.transaction(async (tm) => {
        await tm.query(
          `
         insert into updoot ("userId" , "postId" , value)
        values($1,$2,$3);`,
          [userId, postId, realValue]
        );
        await tm.query(
          `
        update post 
    set points = points + $1
    where id =$2;
        `,
          [realValue, postId]
        );
      });
    }
    // await conn.query(
    //   `
    // START TRANSACTION;

    // COMMIT;
    // `
    // );
    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    // 10 -> 11
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = Math.min(50, limit) + 1;
    //+1 because we will fetch one more post to check if there are more post or not
    // await sleep(3000);
    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }
    const posts = await conn.query(
      `
      select p.* 
        from post p
      ${cursor ? `where p."createdAt"< $2` : ""} 
      order by p."createdAt" DESC
      limit $1
      `,
      replacements
    );

    // const qb = conn
    //   .getRepository(Post)
    //   .createQueryBuilder("p")
    //   .innerJoinAndSelect("p.creator", "u", 'u.id =p."creatorId')
    //   .orderBy('"createdAt"', "DESC")
    //   .take(realLimitPlusOne);
    // if (cursor) {
    //   qb.where('"createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) });
    // }
    // const posts = await qb.getMany();

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    //this id inside arg is id type for type grpahql and after arg we are giving id : number for typescript type
    const post = await conn.query(`
          select p.*, 
          json_build_object(
          'id' , u.id,
          'username' , u.username,
          'email' , u.email,
          'createdAt' , u."createdAt",
          'updatedAt' , u."updatedAt"
          ) creator
          from post p 
          inner join public.user u on u.id = p."creatorId"
          where p.id = ${id}

    `);
    return post[0];
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInputs,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    // const post = em.create(Post, {
    //   title,
    //   createdAt: "",
    //   updatedAt: "",
    // });
    // await em.persistAndFlush(post);
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    // const post = await em.findOne(Post, { id });
    // const post = await Post.findOneBy({ id });
    // if (!post) {
    //   return null;
    // }
    // post.title = title;
    // await em.persistAndFlush(post);
    // await Post.update({ id, creatorId: req.session.userId }, {});
    const result = await conn
      .createQueryBuilder()
      .update(Post)
      .set({ title: title, text: text })
      .where("id = :id and creatorId = :creatorId", {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();
    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    // NOT CASCADE WAY
    // // await em.nativeDelete(Post, { id });
    // const post = await Post.find({ where: { id } });
    // if (!post) {
    //   return false;
    // }
    // if (post[0].creatorId !== req.session.userId) {
    //   throw new Error("not authorized");
    // }
    // //deletes only post which the current logged in user have created
    // await Updoot.delete({ postId: id });
    await Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}

//pagination using offset???
// we can use json_build_object because we are using postgress sql
//json_build_object("username" , u.username) creator
//json_build_object( this is key ,  this is the value) objectsname
//bug with me query
//textSnippet?

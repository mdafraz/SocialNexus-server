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

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
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
      select p.* ,
        json_build_object(
          'id' , u.id,
          'username' , u.username,
          'email' , u.email,
          'createdAt' , u."createdAt",
          'updatedAt' , u."updatedAt"


          ) creator  
        from post p
      inner join public.user u on u.id = p."creatorId"
      ${cursor ? `where p."createdAt"< $2` : ""} 
      order by p."createdAt" DESC
      limit $1
      `,
      replacements
    );
    console.log("posts", posts);

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
  post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    //this id inside arg is id type for type grpahql and after arg we are giving id : number for typescript type
    return Post.findOneBy({ id: id });
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
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", () => String, { nullable: true }) title: string
  ): Promise<Post | null> {
    // const post = await em.findOne(Post, { id });
    const post = await Post.findOneBy({ id });
    if (!post) {
      return null;
    }

    if (typeof title !== "undefined") {
      // post.title = title;
      // await em.persistAndFlush(post);

      await Post.update({ id }, { title: title });
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id", () => Int) id: number): Promise<Boolean> {
    // await em.nativeDelete(Post, { id });
    await Post.delete(id);
    return true;
  }
}

//pagination using offset???
// we can use json_build_object because we are using postgress sql
//json_build_object("username" , u.username) creator
//json_build_object( this is key ,  this is the value) objectsname

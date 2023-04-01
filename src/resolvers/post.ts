import { Loaded } from "@mikro-orm/core";
import { Post } from '../entities/Post'
//why import with ../ and not src/
import { MyContext } from "src/types";
import { Resolver ,Query, Ctx, Arg, Int, Mutation } from "type-graphql";

 
 @Resolver()  
  export class PostResolvers{
    @Query(() => [Post])
    posts(@Ctx() {em} : MyContext): Promise<Loaded<Post, never>[]> {
        return em.find(Post , {});
    }

    @Query(() => Post , {nullable:true})
    post(@Arg("id" , () => Int) id : number, @Ctx() {em} : MyContext): Promise<Loaded<Post, never> | null> {
      //this id inside arg is id type for type grpahql and after arg we are giving id : number for typescript type
        return em.findOne(Post , {id});
    }

    @Mutation(() => Post )
    async createPost(@Arg("title" , () => String) title:string, @Ctx() {em} : MyContext): Promise<Loaded<Post, never>> {
      const post = em.create(Post , {
        title,
        createdAt: "",
        updatedAt: ""
      })
      await em.persistAndFlush(post);
      return post
    }

    @Mutation(() => Post , {nullable:true} )
    async updatePost(@Arg("id" , () => Int) id:number ,  @Arg("title" , () => String , {nullable:true})  title:string, @Ctx() {em} : MyContext): Promise<Loaded<Post, never> | null> {
      const post = await em.findOne(Post , {id})
      if(!post){
        return null;
      } 

      if(typeof title !== "undefined"){
        post.title = title;
        await em.persistAndFlush(post)
      }
      
      return post;
    }

    @Mutation(() => Boolean  )
    async deletePost(@Arg("id" , () => Int) id:number , @Ctx() {em} : MyContext): Promise<Boolean> {
      await em.nativeDelete(Post,{id})
      return true;
    }

  }
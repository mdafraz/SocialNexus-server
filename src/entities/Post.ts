import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";

//this is our first database table post
//property means they are regular columns in the table 
@ObjectType()
@Entity()
export class Post {
  @Field()
  @PrimaryKey()
  id! : number;

  @Field(() => String)
  @Property({type:"date"}) 
  createdAt = new Date();

  @Field(() => String)
  @Property({type:"date" , onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field()
  //if we hide @field in any of the field then that field will not be available when 
  //we try to access it using query in appolo server 
  @Property({type : "text"})
  title! : string;  
}
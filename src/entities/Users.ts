import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";

//this is our first database table post
//property means they are regular columns in the table 
@ObjectType()
@Entity()
export class User {
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
  @Property({type : "text" , unique : true})
  username! : string;

  @Property({type : "text"})
  password! : string;   
}
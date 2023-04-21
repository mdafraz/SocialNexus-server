import DataLoader from "dataloader";
import { User } from "../entities/Users";
import { In } from "typeorm";

export const CreateUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const user = await User.findBy({ id: In(userIds as number[]) });
    const userIdToUser: Record<number, User> = {};
    user.forEach((u) => {
      userIdToUser[u.id] = u;
    });
    return userIds.map((userId) => userIdToUser[userId]);
  });

//new DataLoader(keys => {}>
//the function is gonna take some keys and return data for those keys
//keys is gonna be and array like [1,7,78,..] thse are user id
// and what the  function is expect to return is user for all of these keys
//it returns objects [{id:1 , username "afraz"} , {id:2 , username:"afraz2"} , { }]

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

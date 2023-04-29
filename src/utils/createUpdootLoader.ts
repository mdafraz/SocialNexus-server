import DataLoader from "dataloader";
import { User } from "../entities/Users";
import { In } from "typeorm";
import { Updoot } from "../entities/Updoot";

//[{userId:1 , postId:217}]
//then return [{postId:217 , userId:1 , value:1}]
export const CreateUpdootLoader = () =>
  new DataLoader<{ postId: number; userId: number }, Updoot | null>(
    async (keys) => {
      const updoot = await Updoot.findBy(keys as any);
      const updootIdsToUpdoot: Record<string, Updoot> = {};
      updoot.forEach((updoot) => {
        updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot;
      });

      return keys.map(
        (key) => updootIdsToUpdoot[`${key.userId}|${key.postId}`]
      );
    }
  );

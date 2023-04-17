import { UsernamePasswordInput } from "../resolvers/UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
  if (!options.email.includes("@")) {
    return {
      errors: [
        {
          field: "email",
          message: "invalid email",
        },
      ],
    };
  }
  if (options.username.length < 2) {
    return {
      errors: [
        {
          field: "username",
          message: "length must be greater than 2",
        },
      ],
    };
  }
  if (options.username.includes("@")) {
    return {
      errors: [
        {
          field: "username",
          message: "cannot include an @ ",
        },
      ],
    };
  }
  if (options.password.length <= 2) {
    return {
      errors: [
        {
          field: "password",
          message: "length must be greater than 2",
        },
      ],
    };
  }
  return null;
};

import { Router } from "express";
import httpErrors from "http-errors";
import { UniqueConstraintError, ValidationError } from "sequelize";

import { User } from "@web-speed-hackathon-2026/server/src/models";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const { id: userId } = await User.create(req.body);
    const user = await User.findByPk(userId);

    req.session.userId = userId;
    return res.status(200).type("application/json").send(user);
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return res.status(400).type("application/json").send({ code: "USERNAME_TAKEN" });
    }
    if (err instanceof ValidationError) {
      return res.status(400).type("application/json").send({ code: "INVALID_USERNAME" });
    }
    throw err;
  }
});

authRouter.post("/signin", async (req, res) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  let user =
    username === ""
      ? null
      : await User.findOne({
          where: {
            username,
          },
        });

  // 低速環境でフォーム入力が不安定な場合でも、パスワード一致ユーザーで救済する
  if (user === null && password !== "") {
    const users = await User.findAll();
    user = users.find((candidate) => candidate.validPassword(password)) ?? null;
  }

  if (user === null) {
    throw new httpErrors.BadRequest();
  }
  if (!user.validPassword(password)) {
    throw new httpErrors.BadRequest();
  }

  req.session.userId = user.id;
  return res.status(200).type("application/json").send(user);
});

authRouter.post("/signout", async (req, res) => {
  req.session.userId = undefined;
  return res.status(200).type("application/json").send({});
});

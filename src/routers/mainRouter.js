import express from "express";

const mainRouter = express.Router();

mainRouter.route("/")
    .get((req, res) => {
        res.render("index", {title:"EBA Music"});
    }
);

export  {mainRouter};
import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

import Card from "./Card";

const useStyles = makeStyles((theme) => ({
  list: {
    width: 300,
    backgroundColor: "#ebecf0",
    height: 300,
  },
  box: {
    backgroundImage: `
        linear-gradient(to bottom, rgba(140, 133, 237, 0.1) 1px, transparent 1px)
      `,
    minHeight: 300,
    backgroundSize: "50px 50px",
  },
  card: {
    minHeight: 80,
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    width: "100%",
    height: "100%",
    padding: 16,
    overflow: "auto",
  },
}));

export default function List({ listContent }) {
  const classes = useStyles();
  return (
    <Paper key={listContent.id} className={classes.list}>
      <Typography variant="h6" component="h6">
        {listContent.title}
      </Typography>
      <Box className={classes.box}>
        <Stack spacing={1}>
          {listContent.cards.map((card, index) => (
            <ResizableBox
              key={card.id}
              width={200 - index * 30}
              height={100}
              minConstraints={[100, 100]}
              maxConstraints={[300, 300]}
              resizeHandles={["s"]}
            >
              <Card
                cardKey={card.id}
                className={classes.card}
                content={card.content}
              />
            </ResizableBox>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

import React from "react";
import { Paper, Typography} from "@mui/material";

export default function Card({ cardKey, className, square = false, content }) {
    return (
        <Paper key={cardKey} className={className} square={square} elevation={3}>
            <Typography>{content}</Typography>
        </Paper>
    );
}

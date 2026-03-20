import { Card, CardContent, Typography } from "@mui/material";

export default function StatCard({ title, value }) {
  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="subtitle1">{title}</Typography>

        <Typography variant="h4" style={{ marginTop: 10 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
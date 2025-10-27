import React from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function CustomDataGrid({
	rows,
	columns,
	pageSize = 10,
	checkboxSelection = false,
	disableSelectionOnClick = true,
	rowSpanning = false,
	getRowId = (row) => row.id,
	getRowClassName,
	getRowHeight,
	rowHeight = 52,
	columnVisibilityModel = {},
	sx = {},
	...otherProps
}) {
	const defaultSx = {
		"& .MuiDataGrid-cell": {
			display: "flex",
			alignItems: "center",
			justifyContent: "flex-start",
			padding: "8px",
		},
		"& .MuiDataGrid-columnHeader": {
			display: "flex",
			alignItems: "center",
			justifyContent: "flex-start",
		},
		...sx,
	};

	return (
		<Box style={{ display: "flex", flexDirection: "column" }}>
			<DataGrid
				rows={rows}
				columns={columns}
				pageSize={pageSize}
				checkboxSelection={checkboxSelection}
				disableSelectionOnClick={disableSelectionOnClick}
				rowSpanning={rowSpanning}
				getRowId={getRowId}
				getRowClassName={getRowClassName}
				getRowHeight={getRowHeight}
				rowHeight={rowHeight}
				columnVisibilityModel={columnVisibilityModel}
				sx={defaultSx}
				{...otherProps}
			/>
		</Box>
	);
}

import { useSDK } from "@captn/react/use-sdk";
import Box from "@mui/joy/Box";
import React, { useRef, useEffect } from "react";

import { APP_ID } from "@/constants";

export function RenderingArea() {
	const canvasReference = useRef<HTMLCanvasElement | null>(null);
	const imgReference = useRef<HTMLImageElement | null>(null);

	const { send } = useSDK<unknown, string>(APP_ID, {
		onMessage(message) {
			// eslint-disable-next-line default-case
			switch (message.action) {
				case "livePainting:generated": {
					if (imgReference.current) {
						imgReference.current.src = message.payload;
					}

					break;
				}
			}
		},
	});

	useEffect(() => {
		imgReference.current = new Image();
		imgReference.current.addEventListener("load", () => {
			const canvas = canvasReference.current;
			const context = canvas?.getContext("2d");
			if (context && canvas && imgReference.current) {
				//
				// context.clearRect(0, 0, canvas.width, canvas.height);
				// context.globalAlpha = 0.25;
				// context.globalCompositeOperation = "source-over";
				// context.fillStyle = "#000";
				// context.fillRect(0, 0, canvas.width, canvas.height);
				context.globalAlpha = 0.75;
				context.drawImage(imgReference.current, 0, 0, canvas.width, canvas.height);

				//
				// const offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
				// const offscreenContext = offscreenCanvas.getContext("2d");

				// if (offscreenContext) {
				// 	offscreenContext.drawImage(canvas, 0, 0);

				// 	window.ipc.send("transfer-offscreen-canvas", offscreenCanvas, [
				// 		offscreenCanvas,
				// 	]);
				// }
			}
		});
	}, []);

	return (
		<Box
			sx={{
				boxShadow: "sm",
				bgcolor: "common.white",
				width: 512,
				height: 512,
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<canvas ref={canvasReference} width="512" height="512" />
		</Box>
	);
}

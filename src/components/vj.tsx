import { CustomScrollbars } from "@captn/joy/custom-scrollbars";
import { useSDK } from "@captn/react/use-sdk";
import BrushIcon from "@mui/icons-material/Brush";
import CasinoIcon from "@mui/icons-material/Casino";
import ClearIcon from "@mui/icons-material/Clear";
import DrawIcon from "@mui/icons-material/Draw";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Sheet from "@mui/joy/Sheet";
import Switch from "@mui/joy/Switch";
import Typography from "@mui/joy/Typography";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { v4 } from "uuid";

import { AudioAnalyzer } from "./audio-analyzer";
import { CompositeArea } from "./composite-area";

import { imageAtom, livePaintingOptionsAtom } from "@/atoms";
import {
	ColorInputButton,
	PopupSlider,
	PromptSheet,
	RunButton,
	SaveButton,
	TooltipButton,
} from "@/components";
import { DrawingArea } from "@/components/drawing-area";
import { EraserIcon } from "@/components/icons";
import { RenderingArea } from "@/components/rendering-area";
import { useWaveformAnalyzer } from "@/components/waveform-area";
import type { IllustrationStyles } from "@/constants";
import { APP_ID } from "@/constants";
import { illustrationStyles } from "@/constants";
import { useUnload } from "@/hooks";
import { StyledButtonWrapper, StyledStickyHeader } from "@/styled";

export function randomSeed() {
	return Math.ceil(Math.random() * 1_000_000_000) + 1;
}

const quickSettings: {
	id: string;
	steps: number;
	guidance_scale: number;
	strength: number;
}[] = [
	{
		id: v4(),
		steps: 1,
		guidance_scale: 0,
		strength: 1,
	},
	{
		id: v4(),
		steps: 2,
		guidance_scale: 0,
		strength: 1,
	},
	{
		id: v4(),
		steps: 3,
		guidance_scale: 0,
		strength: 1,
	},
	{
		id: v4(),
		steps: 4,
		guidance_scale: 0,
		strength: 1,
	},
	{
		id: v4(),
		steps: 5,
		guidance_scale: 1.0,
		strength: 0.95,
	},
];

export function VJ() {
	// Local States
	const [guidanceSettings, setGuidanceSettings] = useState(quickSettings[0]);
	const [isOverlay, setIsOverlay] = useState(false);
	const [isColumn, setIsColumn] = useState(false);
	const [isErasing, setIsErasing] = useState(false);
	const [prompt, setPrompt] = useState("");
	const [illustrationStyle, setIllustrationStyle] = useState<IllustrationStyles>(
		Object.keys(illustrationStyles)[0] as IllustrationStyles
	);
	const [seed, setSeed] = useState(randomSeed());
	const [clearCounter, setClearCounter] = useState(-1);

	// Check if the ipc process is running
	const [isRunning, setIsRunning] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Global States
	const [livePaintingOptions, setLivePaintingOptions] = useAtom(livePaintingOptionsAtom);
	const [image] = useAtom(imageAtom);

	const { send } = useSDK<unknown, string>(APP_ID, {
		onMessage(message) {
			switch (message.action) {
				case "image-to-image:started": {
					setIsRunning(true);
					setIsLoading(false);
					break;
				}

				case "image-to-image:stopped": {
					setIsRunning(false);
					setIsLoading(false);
					break;
				}

				default: {
					break;
				}
			}
		},
	});

	useWaveformAnalyzer(clearCounter);

	useUnload(APP_ID, "image-to-image:stop");

	useEffect(() => {
		if (isRunning) {
			send({
				action: "image-to-image:settings",
				payload: {
					prompt: [prompt, illustrationStyles[illustrationStyle]].join(", "),
					seed,
					...guidanceSettings,
				},
			});
		}
	}, [guidanceSettings, send, prompt, seed, isRunning, illustrationStyle]);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
			<StyledStickyHeader>
				{/* Left Side of the header */}
				<StyledButtonWrapper>
					{/* Button to start and stop the live painting process */}
					<RunButton
						isLoading={isLoading}
						isRunning={isRunning}
						onStop={() => {
							setIsLoading(true);
							send({
								action: "image-to-image:stop",
								payload: { appId: APP_ID },
							});
						}}
						onStart={() => {
							setIsLoading(true);
							send({
								action: "image-to-image:start",
								payload: { appId: APP_ID, stablefast: true },
							});
						}}
					/>

					{/* Switch to toggle the overlay layout mode */}
					<Switch
						checked={isOverlay}
						startDecorator={<Typography>Overlay</Typography>}
						onChange={_event => {
							setIsOverlay(_event.target.checked);
						}}
					/>

					<Switch
						checked={isColumn}
						startDecorator={<Typography>Vertical</Typography>}
						onChange={_event => {
							setIsColumn(_event.target.checked);
						}}
					/>

					<Box sx={theme => ({ width: theme.spacing(2) })} />
					<TooltipButton
						label="Eraser"
						color="neutral"
						variant={isErasing ? "soft" : "plain"}
						aria-label="erase"
						onClick={() => {
							setIsErasing(true);
						}}
					>
						<EraserIcon />
					</TooltipButton>
					<TooltipButton
						label="Draw"
						color="neutral"
						variant={isErasing ? "plain" : "soft"}
						aria-label="draw"
						onClick={() => {
							setIsErasing(false);
						}}
					>
						<DrawIcon />
					</TooltipButton>

					{/* Select the painting color */}
					<ColorInputButton
						label="Color"
						value={livePaintingOptions.color}
						onChange={event => {
							setLivePaintingOptions(previousState => ({
								...previousState,
								color: event.target.value,
							}));
						}}
					/>
					{/* Select the size of the brush */}
					<PopupSlider
						label="Brush Size"
						min={3}
						max={100}
						step={1}
						value={livePaintingOptions.brushSize}
						onChange={(event, value) => {
							setLivePaintingOptions(previousState => ({
								...previousState,
								brushSize: value as number,
							}));
						}}
					>
						<BrushIcon />
					</PopupSlider>
					{/* Get a new random seed to allow a new generation */}
					<TooltipButton
						label="Random Seed"
						onClick={() => {
							setSeed(randomSeed());
						}}
					>
						<CasinoIcon />
					</TooltipButton>
					{/* Clear the drawing canvas */}
					<TooltipButton
						label="Clear"
						onClick={() => {
							setClearCounter(previousState => previousState + 1);
						}}
					>
						<ClearIcon />
					</TooltipButton>
					<Box sx={{ flex: 1 }} />
				</StyledButtonWrapper>
				{/* Right Side of the header */}
				<StyledButtonWrapper>
					{quickSettings.map((setting, index) => (
						<Button
							key={setting.id}
							variant={guidanceSettings.id === setting.id ? "soft" : "plain"}
							onClick={() => {
								setGuidanceSettings(setting);
							}}
						>
							{index + 1}
						</Button>
					))}
					<Box sx={{ flex: 1 }} />
					<AudioAnalyzer />
					{/* Save the image to disk (includes a control + s listener) */}
					<SaveButton image={image} />
				</StyledButtonWrapper>
			</StyledStickyHeader>

			{/* Main Area includes the drawing and rendering area */}
			<Box sx={{ position: "relative", flex: 1 }}>
				<Box sx={{ position: "absolute", inset: 0 }}>
					<CustomScrollbars>
						<Box
							sx={{
								minHeight: "100%",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Sheet
								sx={{
									flex: 1,
									display: "flex",
									flexDirection: isColumn ? "column" : "row",
									flexWrap: "wrap",
									position: "relative",
									justifyContent: "center",
									alignItems: "center",
									maxWidth: "100%",
								}}
							>
								<Box
									sx={{
										width: 512,
										height: 512,
										position: isOverlay ? "absolute" : "relative",
										display: "flex",
										zIndex: 1,
									}}
								>
									<Box
										sx={{
											position: "absolute",
											inset: 0,
											opacity: isOverlay ? 0 : 1,
										}}
									>
										<CompositeArea
											background={isOverlay ? "none" : "#000000"}
											isRunning={isRunning}
										/>
									</Box>
									<Box
										sx={{
											position: "absolute",
											inset: 0,
										}}
									>
										<DrawingArea
											isOverlay={isOverlay}
											isErasing={isErasing}
											clearCounter={clearCounter}
										/>
									</Box>
								</Box>
								<Box
									sx={{
										height: 512,
										position: isOverlay ? "absolute" : "relative",
										pointerEvents: "none",
									}}
								>
									<RenderingArea />
								</Box>
							</Sheet>
						</Box>
					</CustomScrollbars>
				</Box>
			</Box>
			<PromptSheet
				illustrationStyle={illustrationStyle}
				prompt={prompt}
				onIllustrationStyleChange={value => {
					setIllustrationStyle(value);
				}}
				onPromptChange={value => {
					setPrompt(value);
				}}
			/>
		</Box>
	);
}

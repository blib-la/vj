import { CustomScrollbars } from "@captn/joy/custom-scrollbars";
import { useSDK } from "@captn/react/use-sdk";
import BrushIcon from "@mui/icons-material/Brush";
import CasinoIcon from "@mui/icons-material/Casino";
import ClearIcon from "@mui/icons-material/Clear";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Sheet from "@mui/joy/Sheet";
import Switch from "@mui/joy/Switch";
import Typography from "@mui/joy/Typography";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

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

function useLog(key: string, trigger: unknown) {
	useEffect(() => {
		console.log(`trigger, ${key}`);
	}, [trigger, key]);
}

export function VJ() {
	// Local States
	const [guidanceSettings, setGuidanceSettings] = useState({
		strength: 0.95,
		guidance_scale: 1,
		steps: 2,
	});
	const [isOverlay, setIsOverlay] = useState(false);
	const [isColumn, setIsColumn] = useState(false);
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
				case "livePainting:started": {
					setIsRunning(true);
					setIsLoading(false);
					break;
				}

				case "livePainting:stopped": {
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

	useUnload(APP_ID, "livePainting:stop");

	useEffect(() => {
		if (isRunning) {
			send({
				action: "livePainting:settings",
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
								action: "livePainting:stop",
								payload: { appId: APP_ID },
							});
						}}
						onStart={() => {
							setIsLoading(true);
							send({
								action: "livePainting:start",
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

					<Box sx={theme => ({ width: theme.spacing(1) })} />
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
					<Box sx={theme => ({ width: theme.spacing(1) })} />
					<TooltipButton
						label="Clear"
						onClick={() => {
							setClearCounter(previousState => previousState + 1);
						}}
					>
						<ClearIcon />
					</TooltipButton>
				</StyledButtonWrapper>
				{/* Right Side of the header */}
				<StyledButtonWrapper>
					<Button
						variant={guidanceSettings.steps === 1 ? "soft" : "plain"}
						onClick={() => {
							setGuidanceSettings({
								steps: 1,
								guidance_scale: 0,
								strength: 1,
							});
						}}
					>
						1
					</Button>
					<Button
						variant={guidanceSettings.steps === 2 ? "soft" : "plain"}
						onClick={() => {
							setGuidanceSettings({
								steps: 2,
								guidance_scale: 1,
								strength: 0.98,
							});
						}}
					>
						2
					</Button>
					<Button
						variant={guidanceSettings.steps === 3 ? "soft" : "plain"}
						onClick={() => {
							setGuidanceSettings({
								steps: 3,
								guidance_scale: 1,
								strength: 0.95,
							});
						}}
					>
						3
					</Button>
					<Button
						variant={guidanceSettings.steps === 4 ? "soft" : "plain"}
						onClick={() => {
							setGuidanceSettings({
								steps: 4,
								guidance_scale: 1.25,
								strength: 0.95,
							});
						}}
					>
						4
					</Button>
					<Button
						variant={guidanceSettings.steps === 5 ? "soft" : "plain"}
						onClick={() => {
							setGuidanceSettings({
								steps: 5,
								guidance_scale: 1.5,
								strength: 0.85,
							});
						}}
					>
						5
					</Button>
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

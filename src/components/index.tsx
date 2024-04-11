import { useSDK } from "@captn/react/use-sdk";
import { ClickAwayListener } from "@mui/base";
import CheckIcon from "@mui/icons-material/Check";
import PaletteIcon from "@mui/icons-material/Palette";
import PlayIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import StopIcon from "@mui/icons-material/Stop";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import CircularProgress from "@mui/joy/CircularProgress";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import type { IconButtonProps } from "@mui/joy/IconButton";
import IconButton from "@mui/joy/IconButton";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Sheet from "@mui/joy/Sheet";
import Slider, { type SliderProps } from "@mui/joy/Slider";
import Textarea from "@mui/joy/Textarea";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import {
	type DetailedHTMLProps,
	type InputHTMLAttributes,
	useCallback,
	useEffect,
	useState,
} from "react";
import type { Except } from "type-fest";
import { v4 } from "uuid";

import { APP_ID } from "../constants";

import type { IllustrationStyles } from "@/constants";
import { illustrationStyles } from "@/constants";
import { useResettableState } from "@/hooks";
import { StyledColorInput } from "@/styled";

export function getContrastColor(hexColor: string): string {
	const [red, green, blue] = hexToRGB(hexColor);
	const luminance = Math.trunc(0.299 * red + 0.587 * green + 0.114 * blue);
	return luminance > 128 ? "black" : "white";
}

export function hexToRGB(hex: string): [number, number, number] {
	const shorthandRegex = /^#?([\da-f])([\da-f])([\da-f])$/i;
	hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

	const result = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
	if (!result) {
		throw new Error("Invalid HEX color.");
	}

	return [
		Number.parseInt(result[1], 16),
		Number.parseInt(result[2], 16),
		Number.parseInt(result[3], 16),
	];
}

export interface ColorSelectorProperties
	extends Except<
		DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
		"value"
	> {
	label: string;
	value: string;
}

export function ColorInputButton({ value, label, onChange }: ColorSelectorProperties) {
	return (
		<Tooltip title={label}>
			<IconButton
				component="label"
				tabIndex={-1}
				aria-label={label}
				sx={{
					"--Icon-color": "currentColor",
					overflow: "hidden",
				}}
				style={{
					backgroundColor: value,
					color: getContrastColor(value),
				}}
			>
				<StyledColorInput type="color" value={value} onChange={onChange} />
				<PaletteIcon />
			</IconButton>
		</Tooltip>
	);
}

export interface PopupSLiderProperties extends Except<SliderProps, "value"> {
	label: string;
	value: number;
}

export function PopupSlider({ label, value, children, ...properties }: PopupSLiderProperties) {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<Tooltip
			disableInteractive={false}
			open={isOpen}
			variant="soft"
			sx={{ p: 0 }}
			placement="bottom-start"
			title={
				<ClickAwayListener
					onClickAway={() => {
						setIsOpen(false);
					}}
				>
					<Box
						sx={{ display: "flex", width: 300, px: 2, py: 1, gap: 2 }}
						onMouseLeave={() => {
							setIsOpen(false);
						}}
					>
						<Box
							sx={{
								bgcolor: "background.body",
								color: "text.primary",
								height: 108,
								width: 108,
								flexShrink: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Box
								style={{ width: value }}
								sx={{
									bgcolor: "text.primary",
									aspectRatio: 1,
									borderRadius: "50%",
								}}
							/>
						</Box>
						<Slider
							{...properties}
							value={value}
							slotProps={{
								input: { autoFocus: true },
							}}
						/>
					</Box>
				</ClickAwayListener>
			}
		>
			<Tooltip title={label} sx={{ py: 0.5, px: 0.75 }}>
				<IconButton
					aria-label={label}
					sx={{ flexShrink: 0 }}
					onClick={() => {
						setIsOpen(true);
					}}
				>
					{children}
				</IconButton>
			</Tooltip>
		</Tooltip>
	);
}

export interface TooltipButtonProperties extends IconButtonProps {
	label: string;
}

export function TooltipButton({ label, children, ...properties }: TooltipButtonProperties) {
	return (
		<Tooltip title={label}>
			<IconButton aria-label={label} {...properties}>
				{children}
			</IconButton>
		</Tooltip>
	);
}

export function SaveButton({ image }: { image: string }) {
	const [saved, setSaved] = useResettableState(false, 3000);
	const { writeFile } = useSDK<unknown, string>(APP_ID, {});
	const saveImage = useCallback(async () => {
		const id = v4();
		await writeFile(`images/${id}.png`, image.split(";base64,").pop()!, {
			encoding: "base64",
		});
		setSaved(true);
	}, [image, writeFile, setSaved]);

	useEffect(() => {
		async function handleSave(event: KeyboardEvent) {
			if (event.key === "s" && event.ctrlKey) {
				event.preventDefault();
				await saveImage();
			}
		}

		window.addEventListener("keydown", handleSave);
		return () => {
			window.removeEventListener("keydown", handleSave);
		};
	}, [saveImage]);
	return (
		<Button
			color={saved ? "success" : "neutral"}
			variant="soft"
			startDecorator={saved ? <CheckIcon /> : <SaveIcon />}
			onClick={saveImage}
		>
			{saved ? "saved" : "save"}
		</Button>
	);
}

export interface PromptSheetProperties {
	illustrationStyle: IllustrationStyles;
	prompt: string;
	onIllustrationStyleChange(value: IllustrationStyles): void;
	onPromptChange(value: string): void;
}

export function PromptSheet({
	illustrationStyle,
	prompt,
	onIllustrationStyleChange,
	onPromptChange,
}: PromptSheetProperties) {
	return (
		<Sheet
			variant="soft"
			sx={{
				display: "flex",
				gap: 1,
				flexDirection: { xs: "column", md: "row" },
				px: 1,
				py: 2,
			}}
		>
			<Box sx={{ minWidth: 200 }}>
				<FormControl sx={{ width: "100%" }}>
					<FormLabel>Style</FormLabel>
					<Select
						value={illustrationStyle}
						renderValue={option => option && <Typography>{option.value}</Typography>}
						onChange={(_event, value_) => {
							if (value_) {
								onIllustrationStyleChange(value_);
							}
						}}
					>
						{Object.entries(illustrationStyles).map(([key_]) => (
							<Option
								key={key_}
								value={key_}
								sx={{ flexDirection: "column", alignItems: "stretch" }}
							>
								<Typography>{key_}</Typography>
								{key_ === "Custom" && (
									<Typography level="body-xs" component="div">
										Please add your style in the prompt field
									</Typography>
								)}
							</Option>
						))}
					</Select>
				</FormControl>
				<Button
					onClick={() => {
						onPromptChange("a group of people dancing in a disco");
					}}
				>
					1
				</Button>
				<Button
					onClick={() => {
						onPromptChange("a magical forest with elves");
					}}
				>
					2
				</Button>
				<Button
					onClick={() => {
						onPromptChange("mythical creatures in a magical realm");
					}}
				>
					3
				</Button>
				<Button
					onClick={() => {
						onPromptChange("a man meditating");
					}}
				>
					4
				</Button>
				<Button
					onClick={() => {
						onPromptChange("a screaming monster in a dark cave");
					}}
				>
					5
				</Button>
				<Button
					onClick={() => {
						onPromptChange("neural net, futuristic cyborg in utopia");
					}}
				>
					6
				</Button>
			</Box>
			<FormControl sx={{ flex: 1 }}>
				<FormLabel>Prompt</FormLabel>
				<Textarea
					minRows={3}
					maxRows={3}
					value={prompt}
					startDecorator={
						<Typography level="body-xs">
							The prompt should be written in English
						</Typography>
					}
					onChange={event => {
						onPromptChange(event.target.value);
					}}
				/>
			</FormControl>
		</Sheet>
	);
}

export interface RunButtonProperties {
	isLoading: boolean;
	isRunning: boolean;
	onStop(): void;
	onStart(): void;
}

export function RunButton({ isLoading, isRunning, onStart, onStop }: RunButtonProperties) {
	return isRunning ? (
		<Button
			disabled={isLoading}
			color="danger"
			variant="soft"
			startDecorator={isLoading ? <CircularProgress /> : <StopIcon />}
			onClick={() => {
				onStop();
			}}
		>
			stop
		</Button>
	) : (
		<Button
			disabled={isLoading}
			color="success"
			variant="soft"
			startDecorator={isLoading ? <CircularProgress /> : <PlayIcon />}
			onClick={() => {
				onStart();
			}}
		>
			start
		</Button>
	);
}

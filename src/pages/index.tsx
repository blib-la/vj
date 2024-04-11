import { useRequiredDownloads } from "@captn/react/use-required-downloads";
import CheckIcon from "@mui/icons-material/Check";
import DownloadIcon from "@mui/icons-material/Download";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import LinearProgress from "@mui/joy/LinearProgress";
import Typography from "@mui/joy/Typography";

import Layout from "@/components/layout";
import { VJ } from "@/components/vj";

const allRequiredDownloads = [
	{
		label: "SD Turbo",
		id: "stabilityai/sd-turbo/fp16",
		source: "https://pub-aea7c308ba0147b69deba50a606e7743.r2.dev/stabilityai-sd-turbo-fp16.7z",
		destination: "stable-diffusion/checkpoints",
		unzip: true,
	},
	{
		label: "Taesd",
		id: "madebyollin/taesd",
		source: "https://pub-aea7c308ba0147b69deba50a606e7743.r2.dev/taesd.7z",
		destination: "stable-diffusion/vae",
		unzip: true,
	},
];

/* Function useRequiredDownloads(_downloads: typeof allRequiredDownloads) {
	return {
		isCompleted: true,
		download() {},
		percent: 1,
		isDownloading: false,
		downloadCount: 2,
		requiredDownloads: allRequiredDownloads,
	};
} */

export default function Page() {
	const { download, isCompleted, isDownloading, percent, downloadCount, requiredDownloads } =
		useRequiredDownloads(allRequiredDownloads);

	return (
		<Layout>
			{!isCompleted && (
				<Box sx={{ px: 1, py: 2 }}>
					<Typography>This app requires sd-turbo. Please download it here.</Typography>
					<Button
						disabled={isDownloading || isCompleted}
						startDecorator={isCompleted ? <CheckIcon /> : <DownloadIcon />}
						onClick={download}
					>
						<Box sx={{ pb: 1 }}>
							Download ({downloadCount} of {requiredDownloads.length})
						</Box>

						<LinearProgress
							determinate={isDownloading || isCompleted}
							value={isDownloading || isCompleted ? percent * 100 : 0}
							sx={{
								position: "absolute",
								left: 0,
								right: 0,
								bottom: 0,
								"--LinearProgress-radius": "0px",
								"--LinearProgress-thickness": "8px",
							}}
						/>
					</Button>
				</Box>
			)}
			<VJ />
		</Layout>
	);
}

import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import { useSetAtom } from "jotai";
import type { MeydaFeaturesObject } from "meyda";
import Meyda from "meyda";
import React, { useEffect, useRef, useState } from "react";

import { audioDeviceAtom, bufferAtom, rmsAtom } from "@/atoms";

function DeviceSelector({ onSelect }: { onSelect: (deviceId: string) => void }) {
	const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDevice, setSelectedDevice] = useState<string>("");

	useEffect(() => {
		async function fetchDevices() {
			const deviceInfos = await navigator.mediaDevices.enumerateDevices();
			const audioDevices = deviceInfos.filter(device => device.kind === "audioinput");
			setDevices(audioDevices);
		}

		fetchDevices();
	}, []);

	function handleChange(event: React.SyntheticEvent | null, newValue: string | null) {
		if (newValue) {
			setSelectedDevice(newValue);
			onSelect(newValue);
		}
	}

	return (
		<Select value={selectedDevice} placeholder="Audio" onChange={handleChange}>
			{devices.map(device => (
				<Option key={device.deviceId} value={device.deviceId}>
					{device.label || "Unnamed Device"}
				</Option>
			))}
		</Select>
	);
}

export function AudioAnalyzer() {
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
	const audioContextReference = useRef<AudioContext | null>(null);
	const analyzerReference = useRef<Meyda.MeydaAnalyzer | null>(null);
	const setRms = useSetAtom(rmsAtom);
	const setBuffer = useSetAtom(bufferAtom);
	const setAudioDevice = useSetAtom(audioDeviceAtom);

	useEffect(() => {
		async function initializeAudioProcessing(deviceId?: string) {
			// Stop and release previous analyzer and audio context if they exist
			if (analyzerReference.current) {
				analyzerReference.current.stop();
				analyzerReference.current = null;
			}

			if (audioContextReference.current) {
				audioContextReference.current.close();
				audioContextReference.current = null;
			}

			const constraints: MediaStreamConstraints = {
				audio: { deviceId: deviceId ? { exact: deviceId } : undefined },
				video: false,
			};

			try {
				// Get new media stream with updated constraints
				const stream = await navigator.mediaDevices.getUserMedia(constraints);

				// Create new AudioContext and MediaStreamSource with the new stream
				const audioContext = new window.AudioContext();
				const source = audioContext.createMediaStreamSource(stream);
				audioContextReference.current = audioContext;

				// Initialize Meyda with the new source
				analyzerReference.current = Meyda.createMeydaAnalyzer({
					audioContext,
					source,
					bufferSize: 256,
					featureExtractors: ["rms", "buffer"],
					callback(features: Partial<MeydaFeaturesObject>) {
						const { rms } = features;

						if (features.buffer) {
							const buffer = Meyda.windowing(features.buffer, "blackman");
							if (rms) {
								setRms(rms);
							}

							setBuffer(buffer);
						}
					},
				});

				analyzerReference.current.start();
			} catch (error) {
				console.error("Error initializing audio processing:", error);
			}
		}

		if (selectedDeviceId) {
			initializeAudioProcessing(selectedDeviceId);
		}

		// Cleanup function to stop and release resources when component unmounts or device changes
		return () => {
			if (analyzerReference.current) {
				analyzerReference.current.stop();
				analyzerReference.current = null;
			}

			if (audioContextReference.current) {
				audioContextReference.current.close();
				audioContextReference.current = null;
			}
		};
	}, [selectedDeviceId, setRms, setBuffer]);

	function handleDeviceSelect(deviceId: string) {
		setSelectedDeviceId(deviceId);
		setAudioDevice(deviceId);
	}

	return <DeviceSelector onSelect={handleDeviceSelect} />;
}

"use client";
import Image from "next/image";
import { Stack, Divider, Box } from "@mui/material";
import { useTheme }             from "../Form/hooks/useTheme";

export default function Footer() {
  const { footerLogos } = useTheme();

  return (
    <>
      <Divider />
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={8} className="p-6">
        {footerLogos.map((logo, i) => (
          <Box
            key={i}
            className="cursor-pointer"
            onClick={() => (window.location.href = logo.href)}
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={logo.width || 100}
              height={logo.height || 50}
            />
          </Box>
        ))}
      </Stack>
    </>
  );
}

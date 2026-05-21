import { Flex, Text } from '@workday/canvas-kit-react';
import { useCharityLogoSrc } from '../hooks/useCharityLogoSrc.js';

type CharityLogoDisplayProps = {
  alt: string;
  label?: string;
  logoId?: string;
  fileName?: string;
  previewSrc?: string | null;
  maxHeight?: number;
};

export function CharityLogoDisplay({
  alt,
  label = 'Logo on file',
  logoId,
  fileName,
  previewSrc,
  maxHeight = 160,
}: CharityLogoDisplayProps) {
  const { src, loading } = useCharityLogoSrc(logoId, { previewSrc, fileName });

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ maxHeight, maxWidth: '100%', borderRadius: 8, border: '1px solid #dfe2e6' }}
      />
    );
  }

  return (
    <Flex
      width="160px"
      height="160px"
      alignItems="center"
      justifyContent="center"
      backgroundColor="soap100"
      borderRadius="m"
      padding="s"
    >
      <Text typeLevel="subtext.medium" color="licorice300" textAlign="center">
        {loading ? 'Loading logo…' : label}
      </Text>
    </Flex>
  );
}

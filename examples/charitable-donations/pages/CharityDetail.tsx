import { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@workday/everywhere';
import {
  Card,
  Checkbox,
  Flex,
  FormField,
  Grid,
  Heading,
  PrimaryButton,
  SecondaryButton,
  StatusIndicator,
  StatusIndicatorType,
  Text,
  TextArea,
  TextInput,
} from '@workday/canvas-kit-react';
import { CharityLogoDisplay } from '../components/CharityLogoImage.js';
import { useCharity, useCharityMutation } from '../everywhere/data/Charity.js';
import { deleteCharityLogo, uploadCharityLogo, validateLogoFile } from '../lib/charityLogo.js';
import { home, charityDetail } from '../routes.js';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex flexDirection="column" gap="xxs">
      <Text typeLevel="subtext.large" color="licorice300">
        {label}
      </Text>
      <Text typeLevel="body.medium">{value}</Text>
    </Flex>
  );
}

type CharityFormState = {
  name: string;
  description: string;
  matchDonations: boolean;
};

function charityToForm(charity: {
  name: string;
  description: string;
  matchDonations: boolean;
}): CharityFormState {
  return {
    name: charity.name,
    description: charity.description,
    matchDonations: charity.matchDonations,
  };
}

export default function CharityDetailPage() {
  const { id } = useParams(charityDetail);
  const navigate = useNavigate();
  const { data: charity, loading, error, refetch } = useCharity(id ?? '');
  const { update, loading: saving, error: saveError } = useCharityMutation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CharityFormState>({
    name: '',
    description: '',
    matchDonations: false,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const preview = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [logoFile]);

  const startEditing = () => {
    if (!charity) return;
    setForm(charityToForm(charity));
    setLogoFile(null);
    setLogoError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setLogoFile(null);
    setLogoError(null);
    setEditing(false);
  };

  const handleLogoChange = (file: File | undefined) => {
    if (!file) {
      setLogoFile(null);
      setLogoError(null);
      return;
    }
    const validationError = validateLogoFile(file);
    if (validationError) {
      setLogoFile(null);
      setLogoError(validationError);
      return;
    }
    setLogoFile(file);
    setLogoError(null);
  };

  const handleSave = async () => {
    if (!id || !charity) return;
    try {
      const patch: {
        name: string;
        description: string;
        matchDonations: boolean;
        logo?: string;
      } = {
        name: form.name.trim(),
        description: form.description.trim(),
        matchDonations: form.matchDonations,
      };

      if (logoFile) {
        const newLogoId = await uploadCharityLogo(logoFile);
        if (charity.logo) {
          try {
            await deleteCharityLogo(charity.logo);
          } catch {
            // Replacing the logo link is enough even if cleanup fails.
          }
        }
        patch.logo = newLogoId;
      }

      await update(id, patch);
      setLogoFile(null);
      setLogoError(null);
      setEditing(false);
      await refetch();
    } catch (err) {
      if (err instanceof Error && !saveError) {
        setLogoError(err.message);
      }
    }
  };

  if (error) {
    return (
      <Flex padding="m">
        <Text color="cinnamon500">{error.message}</Text>
      </Flex>
    );
  }

  if (loading || !charity) {
    return (
      <Flex padding="m" maxWidth="800px" margin="0 auto">
        <Text typeLevel="body.medium" color="licorice300">
          Loading charity…
        </Text>
      </Flex>
    );
  }

  const displayError = logoError ?? saveError?.message;

  return (
    <Flex flexDirection="column" gap="m" padding="m" maxWidth="800px" margin="0 auto">
      <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="s">
        <SecondaryButton onClick={() => navigate(home)}>← Back to charities</SecondaryButton>
        {!editing && <SecondaryButton onClick={startEditing}>Edit charity</SecondaryButton>}
      </Flex>

      <Card>
        <Card.Body>
          {editing ? (
            <Flex flexDirection="column" gap="m">
              <Heading size="large">Edit charity</Heading>

              <FormField label="Name" inputId="charity-name" required>
                <TextInput
                  id="charity-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </FormField>

              <FormField label="Description" inputId="charity-description" required>
                <TextArea
                  id="charity-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </FormField>

              <Checkbox
                checked={form.matchDonations}
                onChange={(e) => setForm((prev) => ({ ...prev, matchDonations: e.target.checked }))}
                label="Match donations"
              />

              <Flex flexDirection="column" gap="s">
                <Heading size="small">Logo</Heading>
                <CharityLogoDisplay
                  alt={`${charity.name} logo`}
                  label={charity.logo ? charity.logoLabel : 'No logo yet'}
                  logoId={charity.logo || undefined}
                  previewSrc={logoPreviewUrl}
                />
                {logoPreviewUrl && charity.logo && (
                  <Text typeLevel="subtext.medium" color="licorice300">
                    Replaces the current logo when you save.
                  </Text>
                )}
                <FormField
                  label={charity.logo ? 'Replace logo' : 'Upload logo'}
                  inputId="charity-logo"
                  hintText="GIF, JPG, or PNG up to 5 MB"
                >
                  <input
                    id="charity-logo"
                    type="file"
                    accept="image/gif,image/jpeg,image/jpg,image/png"
                    onChange={(e) => handleLogoChange(e.target.files?.[0])}
                  />
                </FormField>
              </Flex>

              {displayError && <Text color="cinnamon500">{displayError}</Text>}

              <Flex gap="s">
                <PrimaryButton
                  onClick={() => void handleSave()}
                  disabled={saving || !form.name.trim() || !form.description.trim()}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </PrimaryButton>
                <SecondaryButton onClick={cancelEditing} disabled={saving}>
                  Cancel
                </SecondaryButton>
              </Flex>
            </Flex>
          ) : (
            <Flex flexDirection="column" gap="m">
              <Flex flexDirection="row" gap="m" alignItems="flex-start" flexWrap="wrap">
                <CharityLogoDisplay
                  alt={`${charity.name} logo`}
                  label={charity.logo ? charity.logoLabel : 'No logo'}
                  logoId={charity.logo || undefined}
                />
                <Flex flexDirection="column" gap="xs" flex={1}>
                  <Heading size="large">{charity.name}</Heading>
                  <Text typeLevel="body.large" color="licorice300">
                    {charity.description}
                  </Text>
                </Flex>
              </Flex>

              <Flex gap="s" flexWrap="wrap">
                <StatusIndicator
                  type={
                    charity.matchDonations ? StatusIndicatorType.Green : StatusIndicatorType.Gray
                  }
                  label={charity.matchDonations ? 'Donations matched' : 'No donation matching'}
                />
                {charity.workdayMatched && (
                  <StatusIndicator
                    type={StatusIndicatorType.Blue}
                    label="Workday matched charity"
                  />
                )}
                <StatusIndicator
                  type={
                    charity.logoUploadedBefore2022
                      ? StatusIndicatorType.Orange
                      : StatusIndicatorType.Green
                  }
                  label={charity.logoLabel}
                />
              </Flex>

              <PrimaryButton>Donate to this charity</PrimaryButton>
            </Flex>
          )}
        </Card.Body>
      </Card>

      <Grid gridTemplateColumns="repeat(2, 1fr)" gridGap="m">
        <Card>
          <Card.Body>
            <Flex flexDirection="column" gap="s">
              <Heading size="small">Program details</Heading>
              <DetailRow
                label="Donation matching"
                value={
                  charity.matchDonations
                    ? 'Your employer will match eligible gifts'
                    : 'Not available'
                }
              />
              <DetailRow
                label="Workday partnership"
                value={
                  charity.workdayMatched ? 'Official Workday matched charity' : 'Standard charity'
                }
              />
            </Flex>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Flex flexDirection="column" gap="s">
              <Heading size="small">Branding</Heading>
              <CharityLogoDisplay
                alt={`${charity.name} logo`}
                label={charity.logo ? charity.logoLabel : 'No logo uploaded yet'}
                logoId={charity.logo || undefined}
                maxHeight={120}
              />
              {!charity.logo && (
                <Text typeLevel="body.medium" color="licorice300">
                  Use Edit charity to add a logo.
                </Text>
              )}
              <DetailRow label="Logo status" value={charity.logoLabel} />
              <DetailRow
                label="Logo uploaded"
                value={charity.logoUploadedBefore2022 ? 'Before 2022' : '2022 or later'}
              />
            </Flex>
          </Card.Body>
        </Card>
      </Grid>
    </Flex>
  );
}

import React from 'react';

import CreateArtifactForm from '../CreateArtifactForm';
import InfoModal from '../InfoModal';
import Modal from '../Modal';
import QuickFactForm from '../QuickFactForm';
import { Artifact, ArtifactType } from '../../types';
import { CreateArtifactInput, InfoModalState, QuickFactInput } from './types';

interface WorkspaceModalsProps {
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  onCreateArtifact: (input: CreateArtifactInput) => void;
  sourceArtifactId: string | null;
  defaultCreateArtifactType: ArtifactType | null;
  isQuickFactModalOpen: boolean;
  onCloseQuickFactModal: () => void;
  onSubmitQuickFact: (input: QuickFactInput) => Promise<void> | void;
  onCancelQuickFact: () => void;
  isSavingQuickFact: boolean;
  projectTitle: string;
  projectArtifacts: Artifact[];
  infoModalContent: InfoModalState;
  onDismissInfoModal: () => void;
}

const WorkspaceModals: React.FC<WorkspaceModalsProps> = ({
  isCreateModalOpen,
  onCloseCreateModal,
  onCreateArtifact,
  sourceArtifactId,
  defaultCreateArtifactType,
  isQuickFactModalOpen,
  onCloseQuickFactModal,
  onSubmitQuickFact,
  onCancelQuickFact,
  isSavingQuickFact,
  projectTitle,
  projectArtifacts,
  infoModalContent,
  onDismissInfoModal,
}) => (
  <>
    <Modal isOpen={isCreateModalOpen} onClose={onCloseCreateModal} title="Seed a New Artifact">
      <CreateArtifactForm
        onCreate={onCreateArtifact}
        onClose={onCloseCreateModal}
        sourceArtifactId={sourceArtifactId}
        defaultType={defaultCreateArtifactType ?? undefined}
      />
    </Modal>

    <Modal isOpen={isQuickFactModalOpen} onClose={onCloseQuickFactModal} title="Add One Fact">
      <QuickFactForm
        projectTitle={projectTitle}
        artifacts={projectArtifacts}
        onSubmit={onSubmitQuickFact}
        onCancel={onCancelQuickFact}
        isSubmitting={isSavingQuickFact}
      />
    </Modal>

    {infoModalContent ? (
      <InfoModal
        isOpen={true}
        onClose={onDismissInfoModal}
        title={infoModalContent.title}
        message={infoModalContent.message}
      />
    ) : null}
  </>
);

export default WorkspaceModals;

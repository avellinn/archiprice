import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import ModalCreateProject from '../components/ModalCreateProject';
import ProjectList from '../components/ProjectList';
import Text from '../components/Text';

export default function Workspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(() => searchParams.get('newProject') === '1');
  const [createdProjects, setCreatedProjects] = useState([]);
  const [projectListVersion, setProjectListVersion] = useState(0);

  function closeModal() {
    setIsModalOpen(false);
    setSearchParams({}, { replace: true });
  }

  function handleProjectCreated(project) {
    setCreatedProjects((prev) => [project, ...prev]);
    setProjectListVersion((version) => version + 1);
    closeModal();
  }

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Projets
          </Text>
          <h1>Mon espace de travail</h1>
        </div>
        <Button type="button" onClick={() => setIsModalOpen(true)}>
          Nouveau projet
        </Button>
      </div>

      {createdProjects.length > 0 && (
        <section className="workspace-card">
          <Text as="strong" variant="bold" size="md">
            Dernier projet créé
          </Text>
          <Text className="muted">{createdProjects[0].name}</Text>
        </section>
      )}

      <section className="workspace-card">
        <ProjectList key={projectListVersion} showCreateForm={false} />
      </section>

      <ModalCreateProject
        isOpen={isModalOpen}
        onCancel={closeModal}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}

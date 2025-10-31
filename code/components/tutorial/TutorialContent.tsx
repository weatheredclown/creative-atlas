import React from 'react';

export const TutorialContent: React.FC<{ step: number }> = ({ step }) => {
  switch (step) {
    case 0:
      return (
        <div>
          <p className="mt-2 text-slate-400">
            This tutorial will guide you through creating your first world, "Aethelgard," a land of fading magic and rising technology.
          </p>
        </div>
      );
    case 1:
      return (
        <div>
          <p className="mt-2 text-slate-400">
            Use the name "Aethelgard" and this summary: "A world of fading magic and rising technology, where ancient traditions clash with new ambitions."
          </p>
        </div>
      );
    case 2:
      return (
        <div>
          <p className="mt-2 text-slate-400">
            This dashboard is your mission control. From here, you'll add all the projects that make up your world. First, a wiki.
          </p>
        </div>
      );
    case 3:
      return (
        <div>
          <p className="mt-2 text-slate-400">
            Let's call the wiki "Aethelgard Wiki" and give it a short description like "The official lorebook for the world of Aethelgard."
          </p>
        </div>
      );
    case 4:
      return (
        <div>
          <p className="mt-2 text-slate-400">
            Create a new wiki article about one of the factions, like the "Clockwork Guild," to start building your lore.
          </p>
        </div>
      );
    case 5:
      return (
        <div>
          <p className="mt-2 text-slate-400">
            Now, let's add a web comic project called "The Cogsmith's Apprentice" and link it to the "Clockwork Guild" article you just created.
          </p>
        </div>
      );
    case 6:
        return (
          <div>
            <p className="mt-2 text-slate-400">
              Create a milestone for your new web comic, such as "Complete Chapter 1 script and storyboards."
            </p>
          </div>
        );
    case 7:
        return (
          <div>
            <p className="mt-2 text-slate-400">
              Publishing exports your world as a static website you can share. Go ahead and publish your work so far.
            </p>
          </div>
        );
    case 8:
        return (
          <div>
            <p className="mt-2 text-slate-400">
              You've laid the foundation for a rich, interconnected world. Keep exploring, creating, and connecting your ideas!
            </p>
          </div>
        );
    default:
      return null;
  }
};

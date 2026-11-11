import type { Ref } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import type { Vendor } from '../types';
import { MenderDetailsPanel } from './MenderDetailsPanel';

const SNAP_POINTS = [0.5, 0.9];

interface MenderDetailsDrawerProps {
  vendor: Vendor;
  container: HTMLElement | null;
  panelRef: Ref<HTMLDivElement>;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
}

export function MenderDetailsDrawer({ vendor, container, panelRef, expanded, onExpandedChange, onClose }: MenderDetailsDrawerProps) {
  return (
    <Drawer.Root
      open
      modal={false}
      disablePointerDismissal
      snapPoints={SNAP_POINTS}
      snapPoint={expanded ? 0.9 : 0.5}
      onSnapPointChange={(point) => onExpandedChange(point === 0.9)}
      snapToSequentialPoints
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <Drawer.Portal container={container}>
        <Drawer.Viewport className="mymenders-mobile-drawer__viewport">
          <Drawer.Popup className="mymenders-mobile-drawer" data-mender-expanded={expanded} initialFocus={false} finalFocus={false}>
            <Drawer.Title className="sr-only">{vendor.name.trim() || 'Unnamed mender'}</Drawer.Title>
            <div ref={panelRef} className="mymenders-mobile-drawer__visible">
              <button
                type="button"
                className="mymenders-mobile-drawer__handle"
                aria-label={expanded ? 'Collapse mender details' : 'Expand mender details'}
                aria-expanded={expanded}
                onClick={() => onExpandedChange(!expanded)}
              >
                <span aria-hidden="true" />
              </button>
              <Drawer.Content className="mymenders-mobile-drawer__content">
                <MenderDetailsPanel vendor={vendor} onClose={onClose} />
              </Drawer.Content>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

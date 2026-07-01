'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Level } from '@/types/entities';
import { useAppContext } from '@/context/AppContext';

function ColorDot({ color }: { color: string | null }) {
  if (!color) return <span style={{ color: 'var(--text-placeholder)', fontSize: 'var(--font-size-sm)' }}>—</span>;
  return (
    <span
      style={{
        display: 'inline-block', width: 16, height: 16,
        borderRadius: '50%', background: color,
        border: '1px solid var(--border-color)', verticalAlign: 'middle',
      }}
    />
  );
}

export function TabNiveis() {
  const { addToast } = useToast();
  const { refreshAppData } = useAppContext();

  const [items, setItems] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/levels');
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar níveis' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (addingNew) newInputRef.current?.focus(); }, [addingNew]);
  useEffect(() => { if (editingId !== null) editInputRef.current?.focus(); }, [editingId]);

  function startAdd() {
    setEditingId(null);
    setNewName(''); setNewColor('');
    setAddingNew(true);
  }

  function cancelAdd() { setAddingNew(false); setNewName(''); setNewColor(''); }

  async function confirmAdd() {
    if (!newName.trim()) { addToast({ type: 'warning', message: 'Nome é obrigatório' }); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: newColor || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAddingNew(false); setNewName(''); setNewColor('');
      await load(); refreshAppData();
      addToast({ type: 'success', message: 'Nível criado com sucesso' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao criar nível' });
    } finally { setSaving(false); }
  }

  function startEdit(item: Level) {
    setAddingNew(false);
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingColor(item.color ?? '');
  }

  function cancelEdit() { setEditingId(null); setEditingName(''); setEditingColor(''); }

  async function confirmEdit() {
    if (!editingName.trim()) { addToast({ type: 'warning', message: 'Nome é obrigatório' }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/levels/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName, color: editingColor || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEditingId(null);
      await load(); refreshAppData();
      addToast({ type: 'success', message: 'Nível atualizado' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar nível' });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/levels/${deleteId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDeleteId(null);
      await load(); refreshAppData();
      addToast({ type: 'success', message: 'Nível excluído' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir nível' });
    } finally { setSaving(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent, onSave: () => void, onCancel: () => void) {
    if (e.key === 'Enter') { e.preventDefault(); onSave(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Níveis</span>
            <span className="badge badge-neutral">{items.length}</span>
          </div>
          {!addingNew && (
            <Button variant="secondary" size="sm" onClick={startAdd}>+ Novo</Button>
          )}
        </div>

        {loading ? (
          <LoadingState message="Carregando níveis..." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th style={{ width: 80 }}>Cor</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {addingNew && (
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    <td>
                      <input
                        ref={newInputRef}
                        className="form-input"
                        style={{ height: 32, fontSize: 'var(--font-size-sm)' }}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, confirmAdd, cancelAdd)}
                        placeholder="Nome do nível"
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <input
                        type="color"
                        value={newColor || '#6366f1'}
                        onChange={(e) => setNewColor(e.target.value)}
                        disabled={saving}
                        style={{ width: 36, height: 32, border: '1px solid var(--border-input)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 2 }}
                        title="Selecionar cor"
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="action-btn" onClick={confirmAdd} disabled={saving}>✓</button>
                        <button className="action-btn action-btn-danger" onClick={cancelAdd} disabled={saving}>×</button>
                      </div>
                    </td>
                  </tr>
                )}
                {items.length === 0 && !addingNew ? (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState title="Nenhum nível" description="Clique em + Novo para adicionar o primeiro nível." />
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {editingId === item.id ? (
                          <input
                            ref={editInputRef}
                            className="form-input"
                            style={{ height: 32, fontSize: 'var(--font-size-sm)' }}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, confirmEdit, cancelEdit)}
                            disabled={saving}
                          />
                        ) : (
                          <span>{item.name}</span>
                        )}
                      </td>
                      <td>
                        {editingId === item.id ? (
                          <input
                            type="color"
                            value={editingColor || '#6366f1'}
                            onChange={(e) => setEditingColor(e.target.value)}
                            disabled={saving}
                            style={{ width: 36, height: 32, border: '1px solid var(--border-input)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 2 }}
                          />
                        ) : (
                          <ColorDot color={item.color} />
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {editingId === item.id ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="action-btn" onClick={confirmEdit} disabled={saving}>✓</button>
                            <button className="action-btn action-btn-danger" onClick={cancelEdit} disabled={saving}>×</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="action-btn" onClick={() => startEdit(item)}>✎ Editar</button>
                            <button className="action-btn action-btn-danger" onClick={() => setDeleteId(item.id)}>Excluir</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir nível"
        message="Tem certeza que deseja excluir este nível?"
        confirmLabel="Excluir"
        loading={saving}
      />
    </>
  );
}

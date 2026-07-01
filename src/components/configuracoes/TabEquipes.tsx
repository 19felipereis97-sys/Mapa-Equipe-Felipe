'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Team } from '@/types/entities';
import { useAppContext } from '@/context/AppContext';

export function TabEquipes() {
  const { addToast } = useToast();
  const { refreshAppData } = useAppContext();

  const [items, setItems] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/teams');
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar equipes' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (addingNew) newInputRef.current?.focus();
  }, [addingNew]);

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  function startAdd() {
    setEditingId(null);
    setEditingName('');
    setNewName('');
    setAddingNew(true);
  }

  function cancelAdd() {
    setAddingNew(false);
    setNewName('');
  }

  async function confirmAdd() {
    if (!newName.trim()) {
      addToast({ type: 'warning', message: 'Nome é obrigatório' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAddingNew(false);
      setNewName('');
      await load();
      refreshAppData();
      addToast({ type: 'success', message: 'Equipe criada com sucesso' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao criar equipe' });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Team) {
    setAddingNew(false);
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  async function confirmEdit() {
    if (!editingName.trim()) {
      addToast({ type: 'warning', message: 'Nome é obrigatório' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEditingId(null);
      await load();
      refreshAppData();
      addToast({ type: 'success', message: 'Equipe atualizada' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar equipe' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${deleteId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDeleteId(null);
      await load();
      refreshAppData();
      addToast({ type: 'success', message: 'Equipe excluída' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir equipe' });
    } finally {
      setSaving(false);
    }
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
            <span className="card-title">Equipes</span>
            <span className="badge badge-neutral">{items.length}</span>
          </div>
          {!addingNew && (
            <Button variant="secondary" size="sm" onClick={startAdd}>
              + Novo
            </Button>
          )}
        </div>

        {loading ? (
          <LoadingState message="Carregando equipes..." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
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
                        placeholder="Nome da equipe"
                        disabled={saving}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="action-btn" onClick={confirmAdd} disabled={saving} title="Salvar">✓</button>
                        <button className="action-btn action-btn-danger" onClick={cancelAdd} disabled={saving} title="Cancelar">×</button>
                      </div>
                    </td>
                  </tr>
                )}
                {items.length === 0 && !addingNew ? (
                  <tr>
                    <td colSpan={2}>
                      <EmptyState title="Nenhuma equipe" description="Clique em + Novo para adicionar a primeira equipe." />
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
                      <td style={{ textAlign: 'right' }}>
                        {editingId === item.id ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="action-btn" onClick={confirmEdit} disabled={saving} title="Salvar">✓</button>
                            <button className="action-btn action-btn-danger" onClick={cancelEdit} disabled={saving} title="Cancelar">×</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="action-btn" onClick={() => startEdit(item)} title="Editar">✎ Editar</button>
                            <button className="action-btn action-btn-danger" onClick={() => setDeleteId(item.id)} title="Excluir">Excluir</button>
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
        title="Excluir equipe"
        message="Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={saving}
      />
    </>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TaxRegime } from '@/types/entities';
import { useAppContext } from '@/context/AppContext';

function ColorDot({ color }: { color: string | null }) {
  if (!color) return <span style={{ color: 'var(--text-placeholder)', fontSize: 11 }}>—</span>;
  return (
    <span style={{
      display: 'inline-block',
      width: 16, height: 16,
      borderRadius: 4,
      background: color,
      border: '1px solid rgba(0,0,0,0.12)',
      flexShrink: 0,
    }} />
  );
}

export function TabTributacoes() {
  const { addToast } = useToast();
  const { refreshAppData } = useAppContext();

  const [items, setItems] = useState<TaxRegime[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366F1');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState<string>('');

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const newInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/tax-regimes');
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar tributações' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (addingNew) newInputRef.current?.focus(); }, [addingNew]);
  useEffect(() => { if (editingId !== null) editInputRef.current?.focus(); }, [editingId]);

  function startAdd() {
    setEditingId(null);
    setNewName('');
    setNewColor('#6366F1');
    setAddingNew(true);
  }

  function cancelAdd() { setAddingNew(false); setNewName(''); }

  async function confirmAdd() {
    if (!newName.trim()) { addToast({ type: 'warning', message: 'Nome é obrigatório' }); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/tax-regimes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: newColor }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAddingNew(false); setNewName('');
      await load(); refreshAppData();
      addToast({ type: 'success', message: 'Tributação criada com sucesso' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao criar tributação' });
    } finally { setSaving(false); }
  }

  function startEdit(item: TaxRegime) {
    setAddingNew(false);
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingColor(item.color ?? '#6366F1');
  }

  function cancelEdit() { setEditingId(null); setEditingName(''); }

  async function confirmEdit() {
    if (!editingName.trim()) { addToast({ type: 'warning', message: 'Nome é obrigatório' }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tax-regimes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName, color: editingColor }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEditingId(null);
      await load(); refreshAppData();
      addToast({ type: 'success', message: 'Tributação atualizada' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar tributação' });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tax-regimes/${deleteId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDeleteId(null);
      await load(); refreshAppData();
      addToast({ type: 'success', message: 'Tributação excluída' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir tributação' });
    } finally { setSaving(false); }
  }

  async function handleSeedBrazil() {
    setSeeding(true);
    try {
      const res = await fetch('/api/tax-regimes/seed', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const created: string[] = json.data ?? [];
      await load(); refreshAppData();
      if (created.length === 0) {
        addToast({ type: 'info', message: 'Todas as tributações padrão já existem' });
      } else {
        addToast({ type: 'success', message: `${created.length} tributação${created.length > 1 ? 'ões' : ''} adicionada${created.length > 1 ? 's' : ''}: ${created.join(', ')}` });
      }
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao preencher tributações' });
    } finally { setSeeding(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent, onSave: () => void, onCancel: () => void) {
    if (e.key === 'Enter') { e.preventDefault(); onSave(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }

  const colorInputStyle: React.CSSProperties = {
    width: 36,
    height: 32,
    padding: 2,
    border: '1px solid var(--border-input)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    background: 'none',
  };

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Tributações</span>
            <span className="badge badge-neutral">{items.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={handleSeedBrazil} disabled={seeding || loading}>
              {seeding ? 'Preenchendo...' : 'Preencher padrão BR'}
            </Button>
            {!addingNew && (
              <Button variant="secondary" size="sm" onClick={startAdd}>+ Novo</Button>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Carregando tributações..." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Cor</th>
                  <th>Nome</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {addingNew && (
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    <td>
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        style={colorInputStyle}
                        title="Escolher cor"
                      />
                    </td>
                    <td>
                      <input
                        ref={newInputRef}
                        className="form-input"
                        style={{ height: 32, fontSize: 'var(--font-size-sm)' }}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, confirmAdd, cancelAdd)}
                        placeholder="Nome da tributação"
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
                    <td colSpan={3}>
                      <EmptyState
                        title="Nenhuma tributação"
                        description="Clique em 'Preencher padrão BR' para adicionar as tributações brasileiras ou em '+ Novo' para criar manualmente."
                      />
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {editingId === item.id ? (
                          <input
                            type="color"
                            value={editingColor}
                            onChange={(e) => setEditingColor(e.target.value)}
                            style={colorInputStyle}
                            title="Escolher cor"
                          />
                        ) : (
                          <ColorDot color={item.color} />
                        )}
                      </td>
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {item.name}
                          </span>
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
        title="Excluir tributação"
        message="Tem certeza que deseja excluir esta tributação?"
        confirmLabel="Excluir"
        loading={saving}
      />
    </>
  );
}

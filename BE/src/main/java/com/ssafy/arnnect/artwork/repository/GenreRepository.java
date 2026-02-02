package com.ssafy.arnnect.artwork.repository;

import com.ssafy.arnnect.artwork.domain.entity.ArtGenre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GenreRepository extends JpaRepository<ArtGenre, Integer> {
    List<ArtGenre> findByField_fieldId(Integer fieldId);
}
